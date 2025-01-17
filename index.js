const fs = require('fs');
const axios = require('axios');

/**
 * Parse the Postman collection JSON and extract necessary information.
 * @param {string} collectionPath - Path to the Postman collection JSON file.
 * @returns {Object} Parsed data including requests and global info.
 * @throws {Error} If the collection format is invalid.
 */
function parseCollection(collectionPath) {
    const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
    const { info, item: items } = collection;

    if (!info || !items) {
        throw new Error("Invalid Postman collection format.");
    }

    // Extract global info and auth
    const globalInfo = {
        name: info.name,
        auth: collection.auth || null,
    };

    // Extract all requests
    const requests = [];
    function extractRequests(items) {
        items.forEach((item) => {
            if (item.request) {
                requests.push({
                    name: item.name,
                    method: item.request.method,
                    url: item.request.url.raw || item.request.url,
                    headers: item.request.header || [],
                    body: item.request.body ? item.request.body.raw : null,
                    auth: item.request.auth || null,
                });
            }
            if (item.item) {
                extractRequests(item.item); // Handle nested items
            }
        });
    }
    extractRequests(items);

    return { globalInfo, requests };
}

/**
 * Dynamically apply authentication to headers based on auth type.
 * @param {Object} headers - The headers object to modify.
 * @param {Object} auth - The auth object containing type and credentials.
 * @returns {Object} Updated headers object.
 */
function applyAuth(headers, auth) {
    if (!auth) return headers;

    const authHandlers = {
        apikey: ({ apikey }) => {
            const keyField = apikey.find((entry) => entry.key === 'key')?.value;
            const valueField = apikey.find((entry) => entry.key === 'value')?.value;
            const inField = apikey.find((entry) => entry.key === 'in')?.value;

            if (keyField && valueField && inField === 'header') {
                headers[keyField] = valueField;
            } else {
                console.warn('Unsupported or missing API key configuration.');
            }
        },
        bearer: ({ bearer }) => {
            headers['Authorization'] = `Bearer ${bearer[0].value}`;
        },
        basic: ({ basic }) => {
            const { username, password } = basic;
            headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        },
        // Add more auth types as needed
    };

    const handler = authHandlers[auth.type];
    if (handler) {
        handler(auth);
    } else {
        console.warn(`Unsupported auth type: ${auth.type}`);
    }

    return headers;
}

/**
 * Prepare the headers, including global and request-specific configurations.
 * @param {Array} requestHeaders - Headers specific to the request.
 * @param {Object} requestAuth - Auth specific to the request (optional).
 * @param {Object} globalAuth - Global auth info from the collection (optional).
 * @returns {Object} Final headers object.
 */
function prepareHeaders(requestHeaders, requestAuth, globalAuth) {
    // Start with request-specific headers
    const headers = requestHeaders.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
    }, {});

    // Resolve the most relevant auth (request-level has priority)
    const auth = requestAuth || globalAuth;

    // Apply auth using the extracted logic and return the final headers
    return applyAuth(headers, auth);
}

/**
 * Execute a single HTTP request.
 * @param {Object} request - Parsed request object.
 * @param {Object} globalAuth - Global auth info from the collection.
 * @returns {Promise<Object>} Result of the request execution.
 */
async function executeRequest(request, globalAuth) {
    const startTime = performance.now();
    try {
        const headers = prepareHeaders(request.headers, request.auth, globalAuth);
        const response = await axios({
            method: request.method.toLowerCase(),
            url: request.url,
            headers,
            data: request.body || null,
        });

        const endTime = performance.now();
        return {
            name: request.name,
            status: 'success',
            data: response.data,
            timeTaken: `${(endTime - startTime).toFixed(2)} ms`
        };
    } catch (error) {
        const endTime = performance.now();
        return {
            name: request.name,
            status: 'error',
            error: error.message,
            timeTaken: `${(endTime - startTime).toFixed(2)} ms`
        };
    }
}

/**
 * Log detailed information about a request's execution.
 * @param {string} status - The status of the request (success or error).
 * @param {string} name - The name of the request.
 * @param {string} timeTaken - Time taken for the request to complete.
 * @param {string} error - The error message (if any).
 */
function logRequestResult(status, name, timeTaken, data = null) {
    if (status === 'success') {
        console.log(`✅ [${name}] - Success`);
        console.log(`   Time Taken: ${timeTaken}`);
        console.log(`   Data: ${data}\n`);
    } else {
        console.log(`❌ [${name}] - Failed`);
        console.log(`   Time Taken: ${timeTaken}`);
        console.log(`   Error: ${data}\n`);
    }
}

/**
 * Log the summary report at the end of the test run.
 * @param {number} totalRequests - Total number of requests executed.
 * @param {number} successCount - Number of successful requests.
 * @param {number} failureCount - Number of failed requests.
 * @param {number} totalTime - Total time taken for all requests in ms.
 * @param {number} avgTime - Average time taken for requests in ms.
 */
function logSummaryReport(totalRequests, successCount, failureCount, totalTime, avgTime) {
    console.log('Summary Report:');
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Successful Requests: ${successCount}`);
    console.log(`Failed Requests: ${failureCount}`);
    console.log(`Total Execution Time: ${totalTime.toFixed(2)} ms`);
    console.log(`Average Time per Request: ${avgTime.toFixed(2)} ms`);
}

/**
 * Run all requests concurrently using Promise.allSettled.
 * @param {Array} requests - List of parsed requests.
 * @param {Object} globalAuth - Global auth info from the collection.
 */
async function runConcurrentRequests(requests, globalAuth) {
    const startTime = performance.now();
    const requestPromises = requests.map((request) =>
        executeRequest(request, globalAuth)
    );

    const results = await Promise.allSettled(requestPromises);
    const endTime = performance.now();

    let successCount = 0;
    let failureCount = 0;
    let totalTime = 0;

    console.log(`Execution Results:\n`);
    results.forEach((result, index) => {
        const { name } = requests[index];
        if (result.status === 'fulfilled') {
            successCount++;
            totalTime += parseFloat(result.value.timeTaken);
            logRequestResult('success', name, result.value.timeTaken, JSON.stringify(result.value.data, null, 2));
        } else {
            failureCount++;
            logRequestResult('error', name, result.reason.timeTaken, result.reason.error);
        }
    });

    const avgTime = successCount > 0 ? totalTime / successCount : 0;
    logSummaryReport(requests.length, successCount, failureCount, (endTime - startTime), avgTime);
}

/**
 * Main function to parse the collection and run the requests.
 */
async function main(collectionPath) {
    const { globalInfo, requests } = parseCollection(collectionPath);

    console.log(`Collection Name: ${globalInfo.name}`);
    await runConcurrentRequests(requests, globalInfo.auth);
}

// Driver Code
const COLLECTION_PATH = './postman-collections/Testing.postman_collection.json';
main(COLLECTION_PATH).catch((err) => console.error(`Error: ${err.message}`));
