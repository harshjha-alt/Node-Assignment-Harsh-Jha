const fs = require("node:fs");
const { Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");

const INPUT_FILE = "input.csv";
const OUTPUT_FILE = "output.json";


// =====================================================
// 1. Split incoming chunks into complete lines
// =====================================================

class LineSplitter extends Transform {

    constructor() {
        super({
            readableObjectMode: true
        });

        this.remaining = "";
    }

    _transform(chunk, encoding, callback) {

        this.remaining += chunk.toString();

        const lines = this.remaining.split("\n");

        // Last part may be incomplete
        this.remaining = lines.pop();

        for (let line of lines) {

            line = line.replace(/\r$/, "");

            if (line.length > 0) {
                this.push(line);
            }
        }

        callback();
    }

    _flush(callback) {

        if (this.remaining.length > 0) {
            this.push(this.remaining.replace(/\r$/, ""));
        }

        callback();
    }
}


// =====================================================
// 2. Convert CSV lines into JSON
// =====================================================

class RowsToJson extends Transform {

    constructor() {
        super({
            writableObjectMode: true
        });

        this.headers = null;
        this.firstRow = true;
    }


    _transform(line, encoding, callback) {

        try {

            // First line = CSV headers
            if (!this.headers) {

                this.headers = parseCSVLine(line);

                this.push("[\n");

                callback();
                return;
            }


            const values = parseCSVLine(line);

            const user = {};

            this.headers.forEach((header, index) => {
                user[header] = values[index] ?? "";
            });


            const json = JSON.stringify(user);


            if (!this.firstRow) {
                this.push(",\n");
            }

            this.push(json);

            this.firstRow = false;

            callback();

        } catch (error) {
            callback(error);
        }
    }


    _flush(callback) {

        this.push("\n]\n");

        callback();
    }
}


// =====================================================
// 3. Simple CSV parser
//    Handles commas inside quotes
// =====================================================

function parseCSVLine(line) {

    const result = [];

    let current = "";
    let insideQuotes = false;


    for (let i = 0; i < line.length; i++) {

        const char = line[i];


        // Quote
        if (char === '"') {

            // Escaped quote: ""
            if (insideQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }

            continue;
        }


        // Comma outside quotes
        if (char === "," && !insideQuotes) {

            result.push(current);
            current = "";

            continue;
        }


        current += char;
    }


    result.push(current);

    return result;
}


// =====================================================
// 4. Memory measurement
// =====================================================

let initialRSS = process.memoryUsage().rss;
let peakRSS = initialRSS;


const memoryTimer = setInterval(() => {

    const currentRSS = process.memoryUsage().rss;

    peakRSS = Math.max(peakRSS, currentRSS);

}, 50);


// =====================================================
// 5. Convert CSV -> JSON
// =====================================================

async function convertCSV() {

    const startTime = Date.now();


    const readStream = fs.createReadStream(INPUT_FILE, {
        highWaterMark: 64 * 1024
    });


    const writeStream = fs.createWriteStream(OUTPUT_FILE);


    try {

        await pipeline(
            readStream,
            new LineSplitter(),
            new RowsToJson(),
            writeStream
        );


        const endTime = Date.now();

        clearInterval(memoryTimer);


        const finalRSS = process.memoryUsage().rss;


        console.log("\nConversion completed successfully!");

        console.log("--------------------------------");

        console.log(
            `Initial RSS : ${(initialRSS / 1024 / 1024).toFixed(2)} MB`
        );

        console.log(
            `Peak RSS    : ${(peakRSS / 1024 / 1024).toFixed(2)} MB`
        );

        console.log(
            `Final RSS   : ${(finalRSS / 1024 / 1024).toFixed(2)} MB`
        );

        console.log(
            `Time        : ${((endTime - startTime) / 1000).toFixed(2)} seconds`
        );

        console.log("--------------------------------");

        console.log(`Output file : ${OUTPUT_FILE}`);

    } catch (error) {

        clearInterval(memoryTimer);

        console.error("\nConversion failed!");

        console.error("Error:", error.message);

    }
}


convertCSV();