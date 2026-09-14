# Sync the schema and seed before booting. This must happen at RUNTIME, not during the
# image build: the private network (and so the database host) only exists once the
# container is deployed. Kept in step with railway.json's startCommand, because whichever
# of the two the platform honours has to run the release — skip it and the app boots fine
# but every query fails, since the tables were never created.
web: npm run release && npm start
