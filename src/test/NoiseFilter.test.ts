import test from "node:test";
import assert from "node:assert/strict";
import { NoiseFilter } from "../application/NoiseFilter";
import { ChangeChunk } from "../core/types";

function chunk(text: string): ChangeChunk {
  return {
    type: "added",
    text,
    startLine: 1,
    endLine: 1,
  };
}

test("NoiseFilter removes whitespace and comments-only chunks", () => {
  const filter = new NoiseFilter();
  const filtered = filter.filter([chunk("   \n\t"), chunk("// comment only\n/* block */"), chunk("const x = 1;")]);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].text, "const x = 1;");
});
