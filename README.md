# Postman Collection Runner

This project is a Node.js utility to execute requests from a Postman collection concurrently. It reads the Postman collection JSON file, processes the requests (including handling placeholders and authentication), and executes them using the `axios` library. The tool provides detailed logs for each request's execution status (success or failure), tracks execution time, and generates a comprehensive summary report.

## Features

- Parse Postman collection JSON and extract requests and global information
- Replace placeholders (e.g., `{{PLACEHOLDER}}`) in the collection with environment variables
- Support for multiple authentication types: API Key, Bearer, Basic Auth
- Execute requests concurrently using `Promise.allSettled` for better performance
- Log detailed information for each request, including success/failure, execution time, and response data
- Generate a summary report with:
  - Total execution time
  - Successful/failed requests
  - Average time per request

## Prerequisites

Before you run the project, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Installation

1. Clone the repository to your local machine:

   ```bash
   git clone https://github.com/your-username/postman-collection-runner.git
   ```

2. Navigate to the project directory:

   ```bash
   cd postman-collection-runner
   ```

3. Install the required dependencies:

   ```bash
   npm install
   ```

## Usage

### 1. Prepare the Postman Collection

Make sure you have a Postman collection JSON file. If you don't have one, you can export a collection from Postman by following these steps:

- Open Postman.
- Go to your collection and click on the three dots (`...`).
- Select `Export` and choose the format `Collection v2.1 (recommended)`.
- Save the JSON file.

### 2. Set Up Environment Variables

Create a `.env` file in the root directory to define environment variables used in your Postman collection (e.g., replacing `{{PLACEHOLDER}}` values). Example:

```env
API_KEY=your_api_key
BASE_URL=https://api.example.com
```

### 3. Run the Script

Place your Postman collection JSON file in the `postman-collections` directory or update the `COLLECTION_PATH` variable in the `index.js` file to point to your file.

To run the utility, use the following command:

```bash
npm start
```

This will execute the requests in the collection concurrently and log the results in the terminal. You will also see a summary report at the end of the execution.

### 4. Customization

- **Collection Path**: Update the `COLLECTION_PATH` variable in the `index.js` file to point to your collection file.

- **Authentication**: The tool supports multiple authentication types (API Key, Bearer Token, Basic Auth). Make sure to include the appropriate auth information in your Postman collection.

## Example Output

The output will show detailed logs for each request and a summary at the end:

```yaml
✅ [Request 1] - Success
   Time Taken: 123.45 ms
   Data: User 1 Details

❌ [Request 2] - Failed
   Time Taken: 98.23 ms
   Error: Network Error

✅ [Request 3] - Success
   Time Taken: 65.12 ms
   Data: User 2 Details

Summary Report:
Total Requests: 3
Successful Requests: 2
Failed Requests: 1
Total Execution Time: 350.23 ms
Average Time per Request: 106.56 ms
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
