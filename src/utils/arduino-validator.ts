/**
 * CodeMonitor - Arduino C/C++ In-Browser Basic Syntax Validator
 * 
 * Performs lightweight, fast client-side syntax checking for Arduino / C++ code
 * before students copy code to the Arduino IDE or submit their work.
 * 
 * Checks include:
 * 1. Required Arduino structure: void setup() & void loop()
 * 2. Balanced delimiters: {}, (), [] with exact line numbers
 * 3. Unclosed strings and multi-line comments
 * 4. Missing semicolons (;) on statements
 * 5. Case-sensitivity typos for Arduino built-ins (pinMode, digitalWrite, Serial, etc.)
 * 6. Suspicious assignments in conditionals (if (x = 5)) and misplaced semicolons (if (...);)
 * 7. Header include formats (#include <...>)
 */

export interface ArduinoDiagnostic {
  id: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  snippet?: string;
  rule: string;
}

export interface ArduinoValidationResult {
  isValid: boolean;
  errorsCount: number;
  warningsCount: number;
  infoCount: number;
  diagnostics: ArduinoDiagnostic[];
}

interface DelimiterItem {
  char: string;
  line: number;
  col: number;
}

/**
 * Mask string literals and comments with spaces while preserving line/column offsets.
 * Also detects unclosed strings and unclosed multi-line comments.
 */
export function maskCommentsAndStrings(code: string): {
  maskedCode: string;
  diagnostics: ArduinoDiagnostic[];
} {
  const diagnostics: ArduinoDiagnostic[] = [];
  const chars = code.split('');
  const n = chars.length;
  let i = 0;
  let line = 1;
  let col = 1;

  while (i < n) {
    const ch = chars[i];
    const next = i + 1 < n ? chars[i + 1] : '';

    if (ch === '\n') {
      line++;
      col = 1;
      i++;
      continue;
    }

    // 1. Single-line comment: // ...
    if (ch === '/' && next === '/') {
      chars[i] = ' ';
      chars[i + 1] = ' ';
      i += 2;
      col += 2;
      while (i < n && chars[i] !== '\n') {
        chars[i] = ' ';
        i++;
        col++;
      }
      continue;
    }

    // 2. Multi-line comment: /* ... */
    if (ch === '/' && next === '*') {
      const startLine = line;
      const startCol = col;
      chars[i] = ' ';
      chars[i + 1] = ' ';
      i += 2;
      col += 2;
      let closed = false;

      while (i < n) {
        if (chars[i] === '\n') {
          line++;
          col = 1;
          i++;
        } else if (chars[i] === '*' && i + 1 < n && chars[i + 1] === '/') {
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 2;
          col += 2;
          closed = true;
          break;
        } else {
          chars[i] = ' ';
          i++;
          col++;
        }
      }

      if (!closed) {
        diagnostics.push({
          id: `unclosed-comment-${startLine}`,
          line: startLine,
          column: startCol,
          severity: 'error',
          rule: 'unclosed-comment',
          message: 'Komentar blok /* tidak ditutup dengan */',
          suggestion: 'Tutup komentar blok dengan simbol */ sebelum akhir program.'
        });
      }
      continue;
    }

    // 3. String literal: "..."
    if (ch === '"') {
      const startLine = line;
      const startCol = col;
      chars[i] = ' ';
      i++;
      col++;
      let closed = false;

      while (i < n) {
        if (chars[i] === '\n') {
          // In C/C++, strings cannot span newlines without backslash
          break;
        }
        if (chars[i] === '\\' && i + 1 < n) {
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 2;
          col += 2;
          continue;
        }
        if (chars[i] === '"') {
          chars[i] = ' ';
          i++;
          col++;
          closed = true;
          break;
        }
        chars[i] = ' ';
        i++;
        col++;
      }

      if (!closed) {
        diagnostics.push({
          id: `unclosed-string-${startLine}-${startCol}`,
          line: startLine,
          column: startCol,
          severity: 'error',
          rule: 'unclosed-string',
          message: 'Tanda petik string ganda (") tidak ditutup',
          suggestion: 'Pastikan string diapit dengan tanda petik ganda penutup (").'
        });
      }
      continue;
    }

    // 4. Character literal: '...'
    if (ch === '\'') {
      const startLine = line;
      const startCol = col;
      chars[i] = ' ';
      i++;
      col++;
      let closed = false;

      while (i < n) {
        if (chars[i] === '\n') {
          break;
        }
        if (chars[i] === '\\' && i + 1 < n) {
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 2;
          col += 2;
          continue;
        }
        if (chars[i] === '\'') {
          chars[i] = ' ';
          i++;
          col++;
          closed = true;
          break;
        }
        chars[i] = ' ';
        i++;
        col++;
      }

      if (!closed) {
        diagnostics.push({
          id: `unclosed-char-${startLine}-${startCol}`,
          line: startLine,
          column: startCol,
          severity: 'error',
          rule: 'unclosed-char',
          message: 'Tanda petik karakter (\') tidak ditutup',
          suggestion: 'Pastikan karakter diapit dengan tanda petik tunggal penutup (\').'
        });
      }
      continue;
    }

    i++;
    col++;
  }

  return {
    maskedCode: chars.join(''),
    diagnostics
  };
}

/**
 * Check delimiter balance: {}, (), []
 */
export function checkDelimiterBalance(code: string): ArduinoDiagnostic[] {
  const diagnostics: ArduinoDiagnostic[] = [];
  const { maskedCode } = maskCommentsAndStrings(code);
  const stack: DelimiterItem[] = [];

  const matchMap: Record<string, string> = {
    '}': '{',
    ')': '(',
    ']': '['
  };

  const nameMap: Record<string, string> = {
    '{': 'kurung kurawal {',
    '}': 'kurung kurawal tutup }',
    '(': 'kurung biasa (',
    ')': 'kurung biasa tutup )',
    '[': 'kurung siku [',
    ']': 'kurung siku tutup ]'
  };

  const lines = maskedCode.split('\n');

  for (let l = 0; l < lines.length; l++) {
    const lineText = lines[l];
    const lineNum = l + 1;

    for (let c = 0; c < lineText.length; c++) {
      const ch = lineText[c];
      const colNum = c + 1;

      if (ch === '{' || ch === '(' || ch === '[') {
        stack.push({ char: ch, line: lineNum, col: colNum });
      } else if (ch === '}' || ch === ')' || ch === ']') {
        const expectedOpen = matchMap[ch];
        if (stack.length === 0) {
          diagnostics.push({
            id: `extra-closing-${lineNum}-${colNum}`,
            line: lineNum,
            column: colNum,
            severity: 'error',
            rule: 'mismatched-delimiter',
            message: `Tanda ${nameMap[ch]} berlebih atau tidak memiliki pasangan kurung buka`,
            suggestion: `Hapus kurung tutup '${ch}' ini atau tambahkan kurung buka yang sesuai.`
          });
        } else {
          const top = stack.pop()!;
          if (top.char !== expectedOpen) {
            diagnostics.push({
              id: `mismatched-delimiter-${lineNum}-${colNum}`,
              line: lineNum,
              column: colNum,
              severity: 'error',
              rule: 'mismatched-delimiter',
              message: `Kurung tidak cocok: ditemukan '${ch}', padahal sebelumnya dibuka '${top.char}' pada baris ${top.line}`,
              suggestion: `Periksa kembali penutupan kurung agar sesuai dengan '${top.char}' pada baris ${top.line}.`
            });
          }
        }
      }
    }
  }

  // Any remaining unclosed delimiters
  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    diagnostics.push({
      id: `unclosed-delimiter-${unclosed.line}-${unclosed.col}`,
      line: unclosed.line,
      column: unclosed.col,
      severity: 'error',
      rule: 'unclosed-delimiter',
      message: `Tanda ${nameMap[unclosed.char]} pada baris ini belum ditutup`,
      suggestion: `Tambahkan tanda penutup '${unclosed.char === '{' ? '}' : unclosed.char === '(' ? ')' : ']'}' pada blok program ini.`
    });
  }

  return diagnostics;
}

/**
 * Check mandatory Arduino sketch structure: void setup() & void loop()
 */
export function checkArduinoStructure(maskedCode: string): ArduinoDiagnostic[] {
  const diagnostics: ArduinoDiagnostic[] = [];

  // Check setup
  const hasExactSetup = /\bvoid\s+setup\s*\(\s*\)/.test(maskedCode);
  if (!hasExactSetup) {
    if (/\b(?:int|float|bool|char|double|long)\s+setup\s*\(/.test(maskedCode)) {
      diagnostics.push({
        id: 'setup-return-type',
        line: 1,
        severity: 'error',
        rule: 'arduino-structure',
        message: 'Fungsi setup() harus memiliki tipe kembalian void',
        suggestion: 'Ubah definisi fungsi menjadi "void setup() { ... }".'
      });
    } else if (/\b(?:void\s+)?Setup\s*\(/.test(maskedCode)) {
      diagnostics.push({
        id: 'setup-casing',
        line: 1,
        severity: 'error',
        rule: 'arduino-structure',
        message: 'Fungsi Setup() harus ditulis dengan huruf kecil: void setup()',
        suggestion: 'Ubah "Setup" menjadi "setup" (Arduino bersifat case-sensitive).'
      });
    } else if (/\bvoid\s+setup\b(?!\s*\()/.test(maskedCode)) {
      diagnostics.push({
        id: 'setup-missing-parens',
        line: 1,
        severity: 'error',
        rule: 'arduino-structure',
        message: 'Fungsi setup harus memiliki tanda kurung parameter ()',
        suggestion: 'Gunakan "void setup() { ... }".'
      });
    } else {
      diagnostics.push({
        id: 'missing-setup',
        line: 1,
        severity: 'error',
        rule: 'arduino-structure',
        message: 'Fungsi wajib "void setup()" tidak ditemukan',
        suggestion: 'Arduino sketch wajib memiliki "void setup() { ... }" untuk inisialisasi pin dan modul.'
      });
    }
  }

  // Check loop
  const hasExactLoop = /\bvoid\s+loop\s*\(\s*\)/.test(maskedCode);
  if (!hasExactLoop) {
    if (/\b(?:int|float|bool|char|double|long)\s+loop\s*\(/.test(maskedCode)) {
      diagnostics.push({
        id: 'loop-return-type',
        line: 1,
        severity: 'error',
        rule: 'arduino-structure',
        message: 'Fungsi loop() harus memiliki tipe kembalian void',
        suggestion: 'Ubah definisi fungsi menjadi "void loop() { ... }".'
      });
    } else if (/\b(?:void\s+)?Loop\s*\(/.test(maskedCode)) {
      diagnostics.push({
        id: 'loop-casing',
        line: 1,
        severity: 'error',
        rule: 'arduino-structure',
        message: 'Fungsi Loop() harus ditulis dengan huruf kecil: void loop()',
        suggestion: 'Ubah "Loop" menjadi "loop" (Arduino bersifat case-sensitive).'
      });
    } else if (/\bvoid\s+loop\b(?!\s*\()/.test(maskedCode)) {
      diagnostics.push({
        id: 'loop-missing-parens',
        line: 1,
        severity: 'error',
        rule: 'arduino-structure',
        message: 'Fungsi loop harus memiliki tanda kurung parameter ()',
        suggestion: 'Gunakan "void loop() { ... }".'
      });
    } else {
      diagnostics.push({
        id: 'missing-loop',
        line: 1,
        severity: 'error',
        rule: 'arduino-structure',
        message: 'Fungsi wajib "void loop()" tidak ditemukan',
        suggestion: 'Arduino sketch wajib memiliki "void loop() { ... }" untuk eksekusi program berulang.'
      });
    }
  }

  return diagnostics;
}

/**
 * Check missing semicolons inside C/C++ statements
 */
export function checkMissingSemicolons(maskedCode: string): ArduinoDiagnostic[] {
  const diagnostics: ArduinoDiagnostic[] = [];
  const lines = maskedCode.split('\n');

  // Statement triggers that generally need to terminate with ;
  const statementKeywords = /^(?:pinMode|digitalWrite|digitalRead|analogWrite|analogRead|delay|delayMicroseconds|Serial\.[a-zA-Z0-9_]+|return|break|continue|int|float|double|char|bool|boolean|long|byte|uint8_t|uint16_t|uint32_t|int16_t|int32_t|String|auto)\b/;
  const assignmentPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\[[^\]]*\])?\s*(?:\+=|-=|\*=|\/=|%=|=)/;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    const lineNum = i + 1;

    if (!trimmed) continue;

    // Skip preprocessor directives (#include, #define, etc.)
    if (trimmed.startsWith('#')) {
      if (/^#include\s+[^<"'\s]+$/.test(trimmed)) {
        diagnostics.push({
          id: `invalid-include-${lineNum}`,
          line: lineNum,
          severity: 'error',
          rule: 'invalid-include',
          message: 'Format #include tidak valid',
          suggestion: 'Gunakan tanda kurung sudut <library.h> atau tanda kutip "library.h".',
          snippet: trimmed
        });
      }
      continue;
    }

    // Skip control flow headers, labels, and blocks
    if (
      trimmed.endsWith('{') ||
      trimmed.endsWith('}') ||
      trimmed.endsWith(';') ||
      trimmed.endsWith(':') ||
      trimmed.endsWith('\\') ||
      trimmed.endsWith(',') ||
      trimmed.endsWith('+') ||
      trimmed.endsWith('-') ||
      trimmed.endsWith('*') ||
      trimmed.endsWith('/') ||
      trimmed.endsWith('%') ||
      trimmed.endsWith('=') ||
      trimmed.endsWith('&&') ||
      trimmed.endsWith('||') ||
      trimmed.endsWith('(') ||
      trimmed.endsWith('[')
    ) {
      continue;
    }

    // Skip standard function/control headers that don't need a semicolon on the same line
    if (
      /^(?:if|else|else\s+if|for|while|switch|do)\s*\(/.test(trimmed) ||
      trimmed === 'else' ||
      trimmed === 'do' ||
      /^(?:void|int|float|double|char|bool|long|byte|String)\s+[a-zA-Z0-9_]+\s*\([^)]*\)$/.test(trimmed)
    ) {
      continue;
    }

    // If it starts with common statement keywords or variable assignment, it likely misses a semicolon
    if (statementKeywords.test(trimmed) || assignmentPattern.test(trimmed) || /^[a-zA-Z0-9_]+\s*\([^)]*\)$/.test(trimmed)) {
      diagnostics.push({
        id: `missing-semicolon-${lineNum}`,
        line: lineNum,
        severity: 'error',
        rule: 'missing-semicolon',
        message: 'Kemungkinan lupa tanda titik koma (;) di akhir pernyataan',
        suggestion: 'Tambahkan tanda titik koma (;) di akhir baris ini.',
        snippet: trimmed
      });
    }
  }

  return diagnostics;
}

/**
 * Check common Arduino casing mistakes and typos
 */
export function checkCasingAndTypos(maskedCode: string): ArduinoDiagnostic[] {
  const diagnostics: ArduinoDiagnostic[] = [];
  const lines = maskedCode.split('\n');

  const casingRules: Array<{
    regex: RegExp;
    correct: string;
    description: string;
    severity: 'error' | 'warning';
  }> = [
    {
      regex: /\bpinmode\b/g,
      correct: 'pinMode',
      description: 'Fungsi pinMode harus menggunakan format camelCase: pinMode(pin, mode)',
      severity: 'error'
    },
    {
      regex: /\bdigitalwrite\b/g,
      correct: 'digitalWrite',
      description: 'Fungsi digitalWrite harus menggunakan format camelCase: digitalWrite(pin, value)',
      severity: 'error'
    },
    {
      regex: /\bdigitalread\b/g,
      correct: 'digitalRead',
      description: 'Fungsi digitalRead harus menggunakan format camelCase: digitalRead(pin)',
      severity: 'error'
    },
    {
      regex: /\banalogwrite\b/g,
      correct: 'analogWrite',
      description: 'Fungsi analogWrite harus menggunakan format camelCase: analogWrite(pin, value)',
      severity: 'error'
    },
    {
      regex: /\banalogread\b/g,
      correct: 'analogRead',
      description: 'Fungsi analogRead harus menggunakan format camelCase: analogRead(pin)',
      severity: 'error'
    },
    {
      regex: /\bserial\.(begin|print|println|available|read|write)\b/g,
      correct: 'Serial',
      description: 'Objek Serial Arduino diawali huruf kapital: Serial.begin(), Serial.println()',
      severity: 'error'
    },
    {
      regex: /\bDelay\s*\(/g,
      correct: 'delay',
      description: 'Fungsi delay() harus ditulis dengan huruf kecil semua',
      severity: 'error'
    },
    {
      regex: /\bdelaymicroseconds\b/g,
      correct: 'delayMicroseconds',
      description: 'Gunakan format camelCase: delayMicroseconds(us)',
      severity: 'error'
    },
    {
      regex: /\bpulsein\b/g,
      correct: 'pulseIn',
      description: 'Gunakan format camelCase: pulseIn(pin, value)',
      severity: 'error'
    },
    {
      regex: /\b(output|Output)\b(?=\s*[,);])/g,
      correct: 'OUTPUT',
      description: 'Konstanta mode pin harus huruf kapital semua: OUTPUT',
      severity: 'warning'
    },
    {
      regex: /\b(input|Input)\b(?=\s*[,);])/g,
      correct: 'INPUT',
      description: 'Konstanta mode pin harus huruf kapital semua: INPUT',
      severity: 'warning'
    },
    {
      regex: /\b(input_pullup|Input_pullup|Input_Pullup)\b(?=\s*[,);])/g,
      correct: 'INPUT_PULLUP',
      description: 'Konstanta mode pin harus huruf kapital semua: INPUT_PULLUP',
      severity: 'warning'
    },
    {
      regex: /\b(high|High)\b(?=\s*[,);=])/g,
      correct: 'HIGH',
      description: 'Konstanta status pin harus huruf kapital semua: HIGH',
      severity: 'warning'
    },
    {
      regex: /\b(low|Low)\b(?=\s*[,);=])/g,
      correct: 'LOW',
      description: 'Konstanta status pin harus huruf kapital semua: LOW',
      severity: 'warning'
    },
    {
      regex: /\b(led_builtin|Led_builtin)\b/g,
      correct: 'LED_BUILTIN',
      description: 'Konstanta pin LED bawaan Arduino adalah LED_BUILTIN',
      severity: 'warning'
    }
  ];

  for (let l = 0; l < lines.length; l++) {
    const lineText = lines[l];
    const lineNum = l + 1;

    for (const rule of casingRules) {
      let match: RegExpExecArray | null;
      const re = new RegExp(rule.regex);
      while ((match = re.exec(lineText)) !== null) {
        diagnostics.push({
          id: `casing-${lineNum}-${match.index}`,
          line: lineNum,
          column: match.index + 1,
          severity: rule.severity,
          rule: 'casing-typo',
          message: rule.description,
          suggestion: `Gunakan '${rule.correct}' sebagai pengganti '${match[0]}'.`,
          snippet: lineText.trim()
        });
      }
    }
  }

  return diagnostics;
}

/**
 * Check suspicious conditional assignments and misplaced semicolons
 */
export function checkSuspiciousPatterns(maskedCode: string): ArduinoDiagnostic[] {
  const diagnostics: ArduinoDiagnostic[] = [];
  const lines = maskedCode.split('\n');

  for (let l = 0; l < lines.length; l++) {
    const lineText = lines[l];
    const lineNum = l + 1;
    const trimmed = lineText.trim();

    // 1. Single assignment in 'if' condition: if (x = 5)
    // Matches if (...) where condition has = but not ==, !=, <=, >=
    const ifMatch = lineText.match(/\bif\s*\(([^)]+)\)/);
    if (ifMatch) {
      const condition = ifMatch[1];
      // Check for lone '=' not preceded or followed by =, !, <, >
      if (/(?<![=!<>])=(?![=])/.test(condition)) {
        diagnostics.push({
          id: `assignment-in-if-${lineNum}`,
          line: lineNum,
          severity: 'warning',
          rule: 'suspicious-assignment',
          message: "Penugasan tunggal '=' terdeteksi di dalam kondisi 'if'",
          suggestion: "Gunakan '==' untuk membandingkan kesamaan nilai, bukan '=' (penugasan nilai).",
          snippet: trimmed
        });
      }
    }

    // 2. Semicolon immediately after 'if (...) ;'
    if (/\bif\s*\([^)]*\)\s*;/.test(lineText)) {
      diagnostics.push({
        id: `semicolon-after-if-${lineNum}`,
        line: lineNum,
        severity: 'warning',
        rule: 'misplaced-semicolon',
        message: "Tanda titik koma ';' langsung setelah pernyataan 'if'",
        suggestion: "Hapus tanda ';' di akhir 'if (...)', karena menyebabkan blok di bawahnya selalu dieksekusi tanpa syarat.",
        snippet: trimmed
      });
    }

    // 3. Semicolon immediately after 'while (...) ;' (when not a do-while)
    if (/\bwhile\s*\([^)]*\)\s*;/.test(lineText) && !/\bdo\b/.test(lineText)) {
      diagnostics.push({
        id: `semicolon-after-while-${lineNum}`,
        line: lineNum,
        severity: 'warning',
        rule: 'misplaced-semicolon',
        message: "Tanda titik koma ';' langsung setelah pernyataan 'while'",
        suggestion: "Hapus tanda ';' jika Anda ingin loop menjalankan blok kurung kurawal di bawahnya.",
        snippet: trimmed
      });
    }
  }

  return diagnostics;
}

/**
 * Validate Arduino / C++ source code.
 * Aggregates all checks into a structured validation result.
 */
export function validateArduinoCode(code: string): ArduinoValidationResult {
  if (!code || !code.trim()) {
    return {
      isValid: false,
      errorsCount: 1,
      warningsCount: 0,
      infoCount: 0,
      diagnostics: [
        {
          id: 'empty-sketch',
          line: 1,
          severity: 'error',
          rule: 'empty-sketch',
          message: 'Kode Arduino masih kosong',
          suggestion: 'Tulis fungsi void setup() dan void loop() untuk memulai program Arduino Anda.'
        }
      ]
    };
  }

  const allDiagnostics: ArduinoDiagnostic[] = [];

  // Step 1: Check comments & strings masking and capture unclosed string/comment errors
  const { maskedCode, diagnostics: stringDiagnostics } = maskCommentsAndStrings(code);
  allDiagnostics.push(...stringDiagnostics);

  // Step 2: Check delimiter balance
  const delimiterDiagnostics = checkDelimiterBalance(code);
  allDiagnostics.push(...delimiterDiagnostics);

  // Step 3: Check Arduino structure (setup & loop)
  const structureDiagnostics = checkArduinoStructure(maskedCode);
  allDiagnostics.push(...structureDiagnostics);

  // Step 4: Check missing semicolons
  const semicolonDiagnostics = checkMissingSemicolons(maskedCode);
  allDiagnostics.push(...semicolonDiagnostics);

  // Step 5: Check casing typos
  const casingDiagnostics = checkCasingAndTypos(maskedCode);
  allDiagnostics.push(...casingDiagnostics);

  // Step 6: Check suspicious patterns
  const suspiciousDiagnostics = checkSuspiciousPatterns(maskedCode);
  allDiagnostics.push(...suspiciousDiagnostics);

  // Sort diagnostics by line number
  allDiagnostics.sort((a, b) => a.line - b.line);

  // Deduplicate identical error messages on same line
  const uniqueDiagnostics: ArduinoDiagnostic[] = [];
  const seen = new Set<string>();

  for (const diag of allDiagnostics) {
    const key = `${diag.line}:${diag.rule}:${diag.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueDiagnostics.push(diag);
    }
  }

  const errorsCount = uniqueDiagnostics.filter(d => d.severity === 'error').length;
  const warningsCount = uniqueDiagnostics.filter(d => d.severity === 'warning').length;
  const infoCount = uniqueDiagnostics.filter(d => d.severity === 'info').length;

  return {
    isValid: errorsCount === 0,
    errorsCount,
    warningsCount,
    infoCount,
    diagnostics: uniqueDiagnostics
  };
}

