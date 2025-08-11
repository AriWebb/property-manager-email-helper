/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const axios = require("axios");
const { createReport } = require("docx-templates");
const functions = require("firebase-functions");
// const { onCall, HttpsError } = require("firebase-functions/v2/https");

// const { onRequest, onCall } = require("firebase-functions/v2/https");
const {
  onDocumentCreated,
  Change,
  FirestoreEvent,
} = require("firebase-functions/v2/firestore");
const { onObjectFinalized } = require("firebase-functions/v2/storage");

// The Firebase Admin SDK to access Firestore.
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage, getDownloadURL } = require("firebase-admin/storage");
const { v4: uuidv4 } = require("uuid");
initializeApp();

setGlobalOptions({ maxInstances: 10 });

exports.generateWordDoc = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const authHeader = req.get("Authorization");
  const expectedSecret = "123";
  // const expectedSecret = functions.config().internal.secret_key;

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(403).send("Forbidden");
  }

  const { name, dateandtime } = req.body;

  const templateUrl = `https://firebasestorage.googleapis.com/v0/b/propertymanager-66f54.firebasestorage.app/o/noticeTemplate.docx?alt=media&token=7686970b-e9a4-45ee-a1c1-be2f7567f766`;
  const outputFileName = `${Date.now()}.docx`;
  const response = await axios.get(templateUrl, {
    responseType: "arraybuffer",
  });
  const template = response.data;

  const buffer = await createReport({
    template,
    data: {
      // Info provided when user clicks generate RFA
      name: name,
      dateandtime: dateandtime,
    },
    cmdDelimiter: ["+++", "+++"],
  });

  const bucket = getStorage().bucket();

  // Upload to Firebase Storage (to blData folder)
  const file = bucket.file(outputFileName);
  await file.save(buffer, {
    metadata: {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      metadata: {
        firebaseStorageDownloadTokens: uuidv4(), // Optional: allows public access via token
      },
    },
    resumable: false,
  });
  console.log(`Generated document`);
  const downloadURL = await getDownloadURL(file);
  console.log(`Download URL: ${downloadURL} `);

  // Return a result
  res.status(200).send({ message: downloadURL });
});
