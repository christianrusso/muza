import { test } from "node:test";
import assert from "node:assert/strict";
import { outfitColorToSwatch, outfitColorsToSwatches } from "../src/lib/outfitColors";

test("maps common Spanish color names to hex", () => {
  assert.equal(outfitColorToSwatch("Negro").hex, "#1c1a17");
  assert.equal(outfitColorToSwatch("Blanco").hex, "#f3efe7");
  assert.equal(outfitColorToSwatch("Camel").hex, "#b5895a");
});

test("more specific names win over generic ones", () => {
  // "Azul marino" no debe caer en "azul"
  assert.equal(outfitColorToSwatch("Azul marino").hex, "#2a3a57");
  assert.equal(outfitColorToSwatch("Azul").hex, "#3f5c8a");
  assert.equal(outfitColorToSwatch("Verde oliva").hex, "#6b6b3a");
  assert.equal(outfitColorToSwatch("Verde").hex, "#4c7a52");
});

test("normalization strips accents and case", () => {
  // "Borgoña" (con acento y ñ) debe matchear "borgona"
  assert.equal(outfitColorToSwatch("Borgoña").hex, "#6e2331");
  assert.equal(outfitColorToSwatch("MARRÓN").hex, "#6f4e37");
});

test("light colors get needsBorder, dark ones do not", () => {
  assert.equal(outfitColorToSwatch("Blanco").needsBorder, true);
  assert.equal(outfitColorToSwatch("Crema").needsBorder, true);
  assert.equal(outfitColorToSwatch("Negro").needsBorder, false);
  assert.equal(outfitColorToSwatch("Azul marino").needsBorder, false);
});

test("unknown color falls back to neutral but keeps the name", () => {
  const s = outfitColorToSwatch("Tornasolado");
  assert.equal(s.hex, "#b0aaa0");
  assert.equal(s.name, "Tornasolado");
});

test("deduplicates by normalized name, preserves order and original casing", () => {
  const out = outfitColorsToSwatches(["Negro", "negro", "Blanco", "  BLANCO "]);
  assert.equal(out.length, 2);
  assert.equal(out[0]!.name, "Negro");
  assert.equal(out[1]!.name, "Blanco");
});
