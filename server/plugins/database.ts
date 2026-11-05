export default defineNitroPlugin(() => {
  // Open the database and apply migrations as soon as the server starts.
  getDb();
});
