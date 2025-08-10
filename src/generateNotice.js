const fs = require("fs");
const path = require("path");
const { createReport } = require("docx-templates");

async function generateDocument(name, dateandtime) {
  const templatePath = path.join(__dirname, "noticeTemplate.docx");
  const outputPath = path.join(__dirname, "output.docx");

  const template = fs.readFileSync(templatePath);

  const buffer = await createReport({
    template,
    data: { name, dateandtime },
    cmdDelimiter: ["+++", "+++"],
  });

  fs.writeFileSync(outputPath, buffer);
  console.log("Generated document saved to output.docx");
}

module.exports = { generateDocument };
