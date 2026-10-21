/**
 * Get default starter code template by programming language.
 */
export const getDefaultStarterCode = (language: string): string => {
  if (language === 'Python') {
    return `# Tulis program Python Anda di sini\n# Contoh:\nsuhu = float(input("Masukkan suhu tubuh (derajat C): "))\n\nif suhu > 35:\n    print("Kondisi: Suhu Tinggi / Bahaya")\nelse:\n    print("Kondisi: Suhu Normal")\n`;
  }
  return `// Sesi Praktik Arduino / C++\nvoid setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}\n`;
};

/**
 * Sanitize and validate class code input.
 */
export const sanitizeClassCode = (code: string): string => {
  return code.trim().toUpperCase();
};

/**
 * Calculate student dashboard session metrics.
 */
export const calculateStudentMetrics = (
  sessions: { submission?: { status?: string } | null }[]
) => {
  const total = sessions.length;
  const submitted = sessions.filter(s => s.submission?.status === 'submitted').length;
  const inProgress = sessions.filter(s => s.submission?.status === 'in_progress').length;
  const notStarted = total - (submitted + inProgress);
  return { total, submitted, inProgress, notStarted };
};

