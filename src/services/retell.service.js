'use strict';

// Import dependancy here
const crypto = require('crypto');
const { Retell } = require('retell-sdk');
const { parsePhoneNumber } = require('libphonenumber-js');
const { DUMMY_BATCH_DATA } = require("../call_batch_data");
// const { insertRecored, updateRecored } = require('../models/batchCall.model');

/* =====================================================
   CONFIGURATION
===================================================== */

const MAX_RETRIES = 3;
const DEFAULT_COUNTRY = 'IN';
// const CALL_ATTEMPTS_TBL = 'call_attempts';
const MAX_BATCH_SIZE = 25;

// Retell configuration (official SDK)
const retellClient = new Retell({
    apiKey: 'key_042baf5bb48a6fedc4f39a789d34',
    timeout: 30_000, // 5 min
    maxRetries: 1
});


/* =====================================================
   MAIN FUNCTION (ENTRY POINT)
===================================================== */

async function executeBatchCall() {
    const attempts = DUMMY_BATCH_DATA;
    // console.log("BATCH_CALL_INITIATE", JSON.stringify(attempts));
    
    // if (!Array.isArray(attempts) || attempts.length === 0) {
    //     return {
    //         success: false,
    //         message: 'No attempts to process'
    //     }
    // }

    try {
        /* ---------- BUILD PAYLOAD ---------- */
        // const { validItems, invalidCount } = await buildBatchPayload(attempts);
        const validItems = [
            {
                "to_number":"+918982364625",
                "metadata": { 
                    "patient_name":"Satyam Gour",
                    "surrogate_person_id":"8bb5d855-e896-4a24-8798-3fb54b89a203",
                    "correlation_id":"69d4e516-e418-4a53-9fc2-cb028f7c1596"
                }
            },
            {
                "to_number":"+917000109067",
                "metadata": { 
                    "patient_name":"Bharat Namdev",
                    "surrogate_person_id":"9cc5d855-e896-4a24-8798-3fb54b89a302",
                    "correlation_id":"77e4e516-e418-4a53-9fc2-cb028f7c2697"
                }
            }
        ];

        // for (const attempt of attempts) {
        //     const recareCallToken = crypto.randomUUID();

        //     let validCallAttemptItems = {
        //         to_number: attempt.PHONE_NUMBER,
        //         metadata: {
        //             patient_name: attempt.DISPLAY_NAME || undefined,
        //             surrogate_person_id: attempt.PATIENT_ID,
        //             correlation_id: recareCallToken
        //         }
        //     }

        //     validItems.push(validCallAttemptItems);
        // }
        console.log('BUILD_BATCH_DATA', JSON.stringify(validItems));
        // console.log('BUILD_DATA_INVALID_COUNT', invalidCount);
        const batchCallObj = {
            name: `Test batch call process`,
            from_number: '+14805319024',
            tasks: validItems
        }
        console.log('NEW_BATCHCALL', JSON.stringify(batchCallObj));
        const successCallBatchData = await retellClient.batchCall.createBatchCall(batchCallObj);
        // const successCallBatchData = await retellClient.call.createCall({
        //     from_number: '+14805319024',
        //     to_number: '+918982364625',
        // });
        // const successCallBatchData = await retellClient.call.createPhoneCall({
        //     from_number: '+14805319024',
        //     to_number: '+918982364625',
        // });
        console.log('RETELL_SUCCESS_RESPONSE', JSON.stringify(successCallBatchData));
        
        return {
            success: true,
            attemptBatchPayload: batchCallObj,
            data: successCallBatchData
        }

        // if (validItems.length === 0) {
        //     return res.status(200).json({
        //         success: true,
        //         reason: 'No valid phone numbers after normalization',
        //         invalidCount,
        //         sent: 0
        //     });
        // }

        /* ---------- CHUNK INTO BATCHES ---------- */
        // const chunks = chunkArray(validItems, MAX_BATCH_SIZE);

        // let totalSent = 0, retellResult = [];

        /* ---------- PROCESS EACH CHUNK ---------- */
        // for (const chunk of chunks) {
        //     const response = await callRetellWithRetry(chunk);
        //     console.log('RETELL_RESPONSE_AFTER_CALL', JSON.stringify(response));
        //     if (response.success) {
        //         retellResult.push(response.attemptBatchPayload);
        //     }
        //     // await persistBatchResponse(response);
        //     totalSent += chunk.length;
        // }

        // return {
        //     success: true,
        //     sent: totalSent,
        //     invalidCount,
        //     validItems,
        //     retellBatchResponse: retellResult
        // }
    } catch (error) {
        // Fail-closed: never initiate follow-up calls
        console.error('BATCH_CALL_EXECUTION_FAILED:', JSON.stringify(error));
        // return {
        //     success: false,
        //     message: error.message,
        //     error: error
        // }
        console.error('BATCH_CALL_EXECUTION_FAILED:', {
            success: false,
            message: error.message,
            stack: error?.stack,
            response: error.response?.data
        });
    }
}


/* =====================================================
   PAYLOAD BUILDING
===================================================== */

async function buildBatchPayload(attempts) {
    console.log("ATTEMPT_BUILD", JSON.stringify(attempts));
    
    let invalidCount = 0;
    const validItems = [];

    for (const attempt of attempts) {
        const recareCallToken = crypto.randomUUID();
        const normalizedPhone = normalizePhone(attempt.PHONE_NUMBER);

        if (!normalizedPhone) {
            invalidCount++;
            continue;
        }

        let validCallAttemptItems = {
            to_number: normalizedPhone,
            metadata: {
                patient_name: attempt.DISPLAY_NAME || undefined,
                surrogate_person_id: attempt.PATIENT_ID,
                correlation_id: recareCallToken
            }
            // agent_id: attempt.AGENT_ID,
            // agent_version: attempt.AGENT_VERSION,
        }

        // await insertCallAttempts(validCallAttemptItems)
        validItems.push(validCallAttemptItems);
    }

    return { validItems, invalidCount };
}


/* =====================================================
   PHONE HASH & NORMALIZATION
===================================================== */

function normalizePhone(rawPhone) {
    if (!rawPhone) return null;

    try {
        const phone = parsePhoneNumber(rawPhone, DEFAULT_COUNTRY);
        if (!phone.isValid()) return null;
        return phone.number; // E.164
    } catch {
        return null;
    }
}

function hashPhone(e164) {
    return crypto.createHash('sha256').update(e164).digest('hex');
}


/* =====================================================
   RETELL CALL WITH RETRY
===================================================== */

async function callRetellWithRetry(batchPayload) {
    let attempt = 0;
    console.log("CALLING_RETELL", JSON.stringify(batchPayload));
    
    // while (attempt < MAX_RETRIES) {
        try {
            const batchCallObj = {
                name: `Test batch call process`,
                from_number: '+14805319024',
                tasks: batchPayload
            }
            console.log('NEW_BATCHCALL', JSON.stringify(batchCallObj));
            const successCallBatchData = await retellClient.batchCall.createBatchCall(batchCallObj);
            console.log('RETELL_SUCCESS_RESPONSE', JSON.stringify(successCallBatchData));
            
            return {
                success: true,
                attemptBatchPayload: batchPayload,
                data: successCallBatchData
            }
        } catch (err) {
            attempt++;
            console.log('RETRIED_CALL_TTEMPTS', attempt);
            console.log('RETELL_CALL_ERR',JSON.stringify(err));
            return {
                success: false,
                message: err.message,
                status: err.status,
                error: err,
                data: []
            }
            // if (!isRetryable(err) || attempt >= MAX_RETRIES) {
            //     // throw err;
            //     return {
            //         success: false,
            //         message: err.message,
            //         error: err,
            //         data: []
            //     }
            // }

            // await sleep(2 ** attempt * 300); // expoential backoff
        }
    // }
}


/* =====================================================
   UTILITIES
===================================================== */

function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function isRetryable(err) {
    if (!err.statusCode) return true; // network / timeout
    if (err.statusCode >= 500) return true;
    return false;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/* =====================================================
   DATABASE - OPRATIONS 
===================================================== */

// async function insertCallAttempts(callAttemptItems) {
//     try {
//         const callAttemptId = crypto.randomUUID();
//         const phoneHash = hashPhone(callAttemptItems.to_number);

//         const insertData = {
//             call_attempt_id: callAttemptId,
//             recare_call_token: callAttemptItems.correlation_id,
//             phone_hash: phoneHash,
//             agent_id: callAttemptItems.agent_id,
//             agent_version: callAttemptItems.agent_version,
//         }

//         return await insertRecored(CALL_ATTEMPTS_TBL, insertData)

//     } catch (err) {
//         console.log('FAILED DURING INSERTION CALL ATTEMPT ~~>', err)
//         throw err;
//     }
// }


// async function persistBatchResponse(response) {
//     if (!response || !Array.isArray(response.calls)) return;

//     try {
//         for (const call of response.calls) {
//             let condition = { recare_call_token: call.correlation_id },
//                 updateData = { vendor_call_id: call.call_id }
//             await updateRecored(CALL_ATTEMPTS_TBL, condition, updateData);
//         }
//     } catch (err) {
//         console.log('FAILED DURING BATCH CALL UPDATION:', err);
//         throw err;
//     }
// }


/* =====================================================
   HANDLE WEBHOOK
   Route: https://ae10-122-168-197-152.ngrok-free.app/v1/ingest/batch/webhook/callDetails
   - Verify the webhook comes from Retell
   - https://docs.retellai.com/features/register-webhook
===================================================== */
// async function webhookCallDetails(req, res) {
//     console.log('CALLING WEBHOOK!! Let`s process the response');
//     try {
//         const retellSignVerifyRes = await verifyRetellSignature(req)
//         if (!retellSignVerifyRes) {
//             console.error("Invalid retell signature");
//             return res.status(401).send('Invalid retell signature');
//         }

//         console.log('WEBHOOK REQUEST BODY ~~>', req.body);

//         const { event, call } = req.body;
//         switch (event) {
//             case "call_started":
//                 console.log("Call started event received!");
//                 break;
//             case "call_ended":
//                 console.log("Call ended event received!");
//                 break;
//             case "call_analyzed":
//                 console.log("Call analyzed event received!");
//                 break;
//             default:
//                 console.log("Received an unknown event!");
//         }

//         // UPDATE CALL OUTCOME
//         // await updateCallOutcome({
//         //     callId: call_id,
//         //     token: correlation_id,
//         //     outcome,
//         //     reason,
//         //     started_at,
//         //     ended_at
//         // });

//         res.status(200).json({ message: 'Webhook called successfully!' })
//     } catch (err) {
//         console.error('RETELL WEBHOOK ERROR ~~>', err);
//         return res.status(200).send('ACK');
//     }
// }


// async function verifyRetellSignature(req) {
//     try {
//         const verifyRetellSignatureRes = await Retell.verify(
//             JSON.stringify(req.body),
//             process.env.RETELL_API_KEY,
//             req.headers["x-retell-signature"]
//         );
//         console.log('VERIFY RETELL SIGNATURE RESPONSE ~~>', verifyRetellSignatureRes);
//         return verifyRetellSignatureRes;
//     } catch (error) {
//         console.error('RETELL SIGNATURE VERIFICATION FAILED', error);
//         throw error;
//     }
// }


/* =====================================================
   EXPORT
===================================================== */

module.exports = {
    executeBatchCall,
    // webhookCallDetails
};