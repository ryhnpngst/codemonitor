import { describe, it, expect } from 'vitest';
import { validateArduinoCode } from '../utils/arduino-validator';

describe('Arduino Syntax Validator', () => {
  it('validates a standard Arduino Blink sketch successfully', () => {
    const validBlink = `
// Blink LED sketch
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`;
    const result = validateArduinoCode(validBlink);
    expect(result.isValid).toBe(true);
    expect(result.errorsCount).toBe(0);
    expect(result.warningsCount).toBe(0);
  });

  it('detects missing void setup() and void loop()', () => {
    const code = `
int x = 10;
`;
    const result = validateArduinoCode(code);
    expect(result.isValid).toBe(false);
    expect(result.diagnostics.some(d => d.rule === 'arduino-structure' && d.message.includes('setup'))).toBe(true);
    expect(result.diagnostics.some(d => d.rule === 'arduino-structure' && d.message.includes('loop'))).toBe(true);
  });

  it('detects casing error in Setup() and Loop()', () => {
    const code = `
void Setup() {
}
void Loop() {
}
`;
    const result = validateArduinoCode(code);
    expect(result.isValid).toBe(false);
    expect(result.diagnostics.some(d => d.message.includes('Setup() harus ditulis dengan huruf kecil'))).toBe(true);
    expect(result.diagnostics.some(d => d.message.includes('Loop() harus ditulis dengan huruf kecil'))).toBe(true);
  });

  it('detects non-void return type on setup/loop', () => {
    const code = `
int setup() {
}
int loop() {
}
`;
    const result = validateArduinoCode(code);
    expect(result.isValid).toBe(false);
    expect(result.diagnostics.some(d => d.message.includes('setup() harus memiliki tipe kembalian void'))).toBe(true);
    expect(result.diagnostics.some(d => d.message.includes('loop() harus memiliki tipe kembalian void'))).toBe(true);
  });

  it('detects unclosed curly braces with exact line', () => {
    const code = `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
`;
    const result = validateArduinoCode(code);
    expect(result.isValid).toBe(false);
    // Unclosed brace on line 5 (loop)
    expect(result.diagnostics.some(d => d.rule === 'unclosed-delimiter' && d.line === 5)).toBe(true);
  });

  it('detects mismatched delimiter between parentheses and curly braces', () => {
    const code = `void setup() {
  pinMode(13, OUTPUT;
}
void loop() {
}`;
    const result = validateArduinoCode(code);
    expect(result.isValid).toBe(false);
    expect(result.diagnostics.some(d => d.rule === 'mismatched-delimiter' && d.message.includes("dibuka '(' pada baris 2"))).toBe(true);
  });

  it('detects extra closing delimiter', () => {
    const code = `
void setup() {
}
}
void loop() {
}
`;
    const result = validateArduinoCode(code);
    expect(result.isValid).toBe(false);
    expect(result.diagnostics.some(d => d.rule === 'mismatched-delimiter' && d.line === 4)).toBe(true);
  });

  it('detects unclosed string literal and unclosed block comment', () => {
    const code = `
void setup() {
  Serial.begin(9600);
  Serial.println("Hello World);
}

/* Unfinished comment
void loop() {
}
`;
    const result = validateArduinoCode(code);
    expect(result.isValid).toBe(false);
    expect(result.diagnostics.some(d => d.rule === 'unclosed-string' && d.line === 4)).toBe(true);
    expect(result.diagnostics.some(d => d.rule === 'unclosed-comment' && d.line === 7)).toBe(true);
  });

  it('detects missing semicolon on statements', () => {
    const code = `
void setup() {
  pinMode(13, OUTPUT)
  int x = 5
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000)
}
`;
    const result = validateArduinoCode(code);
    expect(result.isValid).toBe(false);
    const semicolonErrors = result.diagnostics.filter(d => d.rule === 'missing-semicolon');
    expect(semicolonErrors.length).toBeGreaterThanOrEqual(3);
  });

  it('detects common Arduino casing mistakes (digitalwrite, pinmode, output, high)', () => {
    const code = `
void setup() {
  pinmode(13, output);
}

void loop() {
  digitalwrite(13, high);
  Delay(500);
  serial.println("test");
}
`;
    const result = validateArduinoCode(code);
    expect(result.diagnostics.some(d => d.suggestion?.includes('pinMode'))).toBe(true);
    expect(result.diagnostics.some(d => d.suggestion?.includes('OUTPUT'))).toBe(true);
    expect(result.diagnostics.some(d => d.suggestion?.includes('digitalWrite'))).toBe(true);
    expect(result.diagnostics.some(d => d.suggestion?.includes('HIGH'))).toBe(true);
    expect(result.diagnostics.some(d => d.suggestion?.includes('delay'))).toBe(true);
    expect(result.diagnostics.some(d => d.suggestion?.includes('Serial'))).toBe(true);
  });

  it('ignores Arduino keywords inside comments and strings', () => {
    const code = `
// Catatan: pinmode dan digitalwrite harus dicek
void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("high output digitalwrite");
}

void loop() {
  /* multi-line comment:
     Delay(100);
     serial.print();
  */
  digitalWrite(13, HIGH);
  delay(1000);
}
`;
    const result = validateArduinoCode(code);
    expect(result.isValid).toBe(true);
    expect(result.errorsCount).toBe(0);
    expect(result.warningsCount).toBe(0);
  });

  it('warns about assignment in if condition and misplaced semicolon after if', () => {
    const code = `
void setup() {
  int x = 0;
}

void loop() {
  int x = 10;
  if (x = 5) {
    x = 2;
  }
  if (x == 2); {
    x = 3;
  }
}
`;
    const result = validateArduinoCode(code);
    expect(result.diagnostics.some(d => d.rule === 'suspicious-assignment')).toBe(true);
    expect(result.diagnostics.some(d => d.rule === 'misplaced-semicolon')).toBe(true);
  });
});
