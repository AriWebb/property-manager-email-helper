// const fs = require("fs");
// const path = require("path");
const { createReport } = require("docx-templates");

async function generateDocument(name, dateandtime) {
  console.log("generating doc!");

  const templatePath = `https://firebasestorage.googleapis.com/v0/b/drafter-63ad4.firebasestorage.app/o/blData%2FnoticeTemplate.docx?alt=media&token=2a0594b5-0fb1-42ab-bf4a-cd6ee66a9b1c`;
  // const outputPath = path.join(__dirname, "output.docx");

  const template = fs.readFileSync(templatePath);

  const buffer = await createReport({
    template,
    data: { name, dateandtime },
    cmdDelimiter: ["+++", "+++"],
  });

  // fs.writeFileSync(outputPath, buffer);
  return buffer;
}

module.exports = { generateDocument };
