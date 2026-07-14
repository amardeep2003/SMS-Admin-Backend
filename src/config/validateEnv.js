const requiredVars = ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET", "MONGO_URI"];

const validateEnv = () => {
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `FATAL: Missing required environment variables: ${missing.join(", ")}`
    );
    console.error(
      "Please set them in your .env file before starting the server."
    );
    process.exit(1);
  }

  // Set defaults for optional variables
  if (!process.env.ACCESS_TOKEN_EXPIRES_IN) {
    process.env.ACCESS_TOKEN_EXPIRES_IN = "15m";
  }

  if (!process.env.REFRESH_TOKEN_EXPIRES_IN) {
    process.env.REFRESH_TOKEN_EXPIRES_IN = "7d";
  }

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
  }
};

export default validateEnv;
