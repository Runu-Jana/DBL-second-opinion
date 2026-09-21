(async () => {
// Each case loads lib/otp.js fresh under a different env, since the adapters read env at require
// time. fetch is stubbed so nothing is ever actually sent.
const path = require('path');
const ROOT = process.cwd();

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
};

function load(env) {
  for (const k of Object.keys(require.cache)) if (k.includes(path.join('server', 'lib'))) delete require.cache[k];
  for (const k of ['OTP_CHANNEL','RESEND_API_KEY','WHATSAPP_TOKEN','WHATSAPP_PHONE_ID','WHATSAPP_BASE_URL','WHATSAPP_AUTH_HEADER','MSG91_AUTH_KEY','MSG91_OTP_TEMPLATE_ID']) delete process.env[k];
  Object.assign(process.env, env);
  return require(path.join(ROOT, 'server', 'lib', 'otp.js'));
}

const calls = [];
global.fetch = async (url, opts) => { calls.push({ url: String(url), opts }); return { ok: true, status: 200, text: async () => '{"ok":true}' }; };

// --- channel selection ---
check('default channel is email', load({}).otpChannel(), 'email');
check('email asks for an email address', load({}).otpTarget(), 'email');
check('whatsapp asks for a phone', load({ OTP_CHANNEL: 'whatsapp' }).otpTarget(), 'phone');
check('sms asks for a phone', load({ OTP_CHANNEL: 'sms' }).otpTarget(), 'phone');
check('an unknown channel falls back to email', load({ OTP_CHANNEL: 'carrier-pigeon' }).otpChannel(), 'email');

// --- configured? gates production ---
check('email unconfigured without a Resend key', load({ OTP_CHANNEL: 'email' }).otpConfigured(), false);
check('email configured with a Resend key', load({ OTP_CHANNEL: 'email', RESEND_API_KEY: 'x' }).otpConfigured(), true);
check('whatsapp needs a token', load({ OTP_CHANNEL: 'whatsapp', WHATSAPP_PHONE_ID: '1' }).otpConfigured(), false);
check('whatsapp direct: token + phone id', load({ OTP_CHANNEL: 'whatsapp', WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_ID: '1' }).otpConfigured(), true);
check('whatsapp reseller: token + base url, no phone id', load({ OTP_CHANNEL: 'whatsapp', WHATSAPP_TOKEN: 't', WHATSAPP_BASE_URL: 'https://waba-v2.360dialog.io' }).otpConfigured(), true);
check('sms needs key + template', load({ OTP_CHANNEL: 'sms', MSG91_AUTH_KEY: 'k' }).otpConfigured(), false);
check('sms configured with both', load({ OTP_CHANNEL: 'sms', MSG91_AUTH_KEY: 'k', MSG91_OTP_TEMPLATE_ID: 't' }).otpConfigured(), true);

// --- unconfigured never sends ---
calls.length = 0;
const dev = await load({ OTP_CHANNEL: 'email' }).sendCode({ to: 'a@b.com', name: 'A', code: '123456' });
check('unconfigured returns dev mode', dev.dev, true);
check('unconfigured sends nothing', calls.length, 0);

// --- email adapter ---
calls.length = 0;
const mail = await load({ OTP_CHANNEL: 'email', RESEND_API_KEY: 'key' }).sendCode({ to: 'lead@example.com', name: 'Asha', code: '424242' });
check('email reports its channel', [mail.dev, mail.channel], [false, 'email']);
check('email hits Resend', calls[0].url, 'https://api.resend.com/emails');
const body = JSON.parse(calls[0].opts.body);
check('email goes to the lead', body.to, 'lead@example.com');
check('code is in the subject', body.subject.includes('424242'), true);
check('code is in the body', body.html.includes('424242'), true);

// --- whatsapp: Meta direct vs reseller, same message body ---
calls.length = 0;
await load({ OTP_CHANNEL: 'whatsapp', WHATSAPP_TOKEN: 'tok', WHATSAPP_PHONE_ID: '99' }).sendCode({ to: '9876543210', name: 'A', code: '111222' });
const meta = calls[0];
check('meta direct url', meta.url, 'https://graph.facebook.com/v20.0/99/messages');
check('meta uses a bearer token', meta.opts.headers.Authorization, 'Bearer tok');

calls.length = 0;
await load({ OTP_CHANNEL: 'whatsapp', WHATSAPP_TOKEN: 'apikey', WHATSAPP_BASE_URL: 'https://waba-v2.360dialog.io/', WHATSAPP_AUTH_HEADER: 'D360-API-KEY' }).sendCode({ to: '9876543210', name: 'A', code: '111222' });
const bsp = calls[0];
check('reseller url (trailing slash trimmed)', bsp.url, 'https://waba-v2.360dialog.io/messages');
check('reseller uses a raw key header', bsp.opts.headers['D360-API-KEY'], 'apikey');
check('reseller sends no bearer header', bsp.opts.headers.Authorization, undefined);
check('message body is byte-identical across both', bsp.opts.body === meta.opts.body, true);
check('bare 10-digit number got the country code', JSON.parse(meta.opts.body).to, '919876543210');

// --- sms adapter ---
calls.length = 0;
await load({ OTP_CHANNEL: 'sms', MSG91_AUTH_KEY: 'k', MSG91_OTP_TEMPLATE_ID: 'tpl' }).sendCode({ to: '919876543210', name: 'A', code: '333444' });
check('msg91 endpoint + params', calls[0].url, 'https://control.msg91.com/api/v5/otp?template_id=tpl&mobile=919876543210&otp=333444');
check('msg91 authkey header', calls[0].opts.headers.authkey, 'k');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

})();