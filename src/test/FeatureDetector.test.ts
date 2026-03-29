import test from "node:test";
import assert from "node:assert/strict";
import { FeatureDetector } from "../application/FeatureDetector";
import { FileChange } from "../core/types";

function fileChange(relativePath: string, code: string): FileChange {
  return {
    relativePath,
    languageId: "typescript",
    chunks: [
      {
        type: "added",
        text: code,
        startLine: 1,
        endLine: 1,
      },
    ],
    timestamp: "2026-03-29T00:00:00.000Z",
  };
}

test("FeatureDetector classifies express routes as api", () => {
  const detector = new FeatureDetector();
  const result = detector.detect(fileChange("src/api/users.ts", "router.get('/users', listUsers)"));

  assert.equal(result.feature.kind, "api");
  assert.equal(result.apis.length > 0, true);
});

test("FeatureDetector extracts HTTP method and route for app handlers", () => {
  const detector = new FeatureDetector();
  const code = [
    "app.post('/api/auth/signup', signupHandler);",
    "app.post('/api/auth/login', loginHandler);",
  ].join("\n");

  const result = detector.detect(fileChange("backend/server.js", code));

  assert.equal(result.feature.kind, "api");
  assert.equal(result.apis.some((line) => line.includes("POST /api/auth/signup")), true);
  assert.equal(result.apis.some((line) => line.includes("POST /api/auth/login")), true);
});

test("FeatureDetector classifies React components as component", () => {
  const detector = new FeatureDetector();
  const code = "function UserCard() { return (<div>User</div>); }";
  const result = detector.detect(fileChange("src/components/UserCard.tsx", code));

  assert.equal(result.feature.kind, "component");
  assert.equal(result.components.length > 0, true);
});

test("FeatureDetector classifies schemas as model", () => {
  const detector = new FeatureDetector();
  const code = "const userSchema = new Schema({ name: String });";
  const result = detector.detect(fileChange("src/models/User.ts", code));

  assert.equal(result.feature.kind, "model");
  assert.equal(result.database.length > 0, true);
});

test("FeatureDetector classifies SQL schemas and mysql pools as model", () => {
  const detector = new FeatureDetector();
  const sql = "CREATE TABLE users (id INT PRIMARY KEY);";
  const sqlResult = detector.detect(fileChange("backend/schema.sql", sql));

  assert.equal(sqlResult.feature.kind, "model");
  assert.equal(sqlResult.database.some((line) => line.includes("Table users defined")), true);

  const dbJs = "const pool = mysql.createPool({ host: process.env.DB_HOST });";
  const dbResult = detector.detect(fileChange("backend/db.js", dbJs));
  assert.equal(dbResult.feature.kind, "model");
  assert.equal(dbResult.database.some((line) => line.includes("connection pool configured")), true);
});
