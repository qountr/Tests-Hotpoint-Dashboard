# Hotpoint-Testing

## Prerequisites

- **Node.js** (v16 or later recommended)
- **npm** (comes with Node.js)

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create a `.env` file in the project root:**

   ```
   API_URL=http://localhost:8080/bihotpoint/services/api
   EMAIL=your-admin-email@example.com
   PASSWORD=your-admin-password
   ```

   Replace the values with your actual API URL and admin credentials.

## Running the Tests

To run all tests:

```bash
npm test
```

## Notes

- The tests use Mocha, Chai, and Supertest.
- Make sure your API server is running and accessible at the URL specified in your `.env` file.
- If you see errors about missing environment variables, double-check your `.env` file.
