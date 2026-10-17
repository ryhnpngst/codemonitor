# Product Requirements Document (PRD)

## CodeMonitor — Platform Praktik dan Monitoring Pemrograman Siswa

**Versi:** 1.0 — MVP  
**Platform:** Web Application  
**Target pengguna:** Guru dan peserta didik SMK  
**Fokus:** Praktik coding, eksekusi Python, dan monitoring aktivitas coding secara real-time.

---

# 1. Product Overview

**CodeMonitor** adalah platform praktik pemrograman berbasis web yang memungkinkan peserta didik menulis dan menjalankan kode dalam satu lingkungan pembelajaran, sementara guru dapat memonitor aktivitas coding setiap peserta didik secara real-time.

CodeMonitor dikembangkan untuk mengatasi keterbatasan guru dalam memantau proses praktik pemrograman ketika peserta didik bekerja menggunakan komputer masing-masing.

Dalam platform ini, peserta didik dapat:

> **Membaca tugas → Menulis kode → Menjalankan program → Melihat output/error → Memperbaiki kode → Submit**

Pada saat yang sama, guru dapat mengetahui:

> **Belum mulai → Sedang coding → Menjalankan program → Mengalami error → Tidak aktif → Sudah submit**

Setiap peserta didik hanya memiliki akses terhadap kode miliknya sendiri. Guru memiliki akses _read-only_ terhadap kode peserta didik pada kelas yang diampunya.

Untuk Python, program dapat dijalankan langsung pada browser. Untuk Arduino/C++, CodeMonitor berfungsi sebagai lingkungan penulisan dan monitoring kode, sedangkan proses kompilasi dan upload ke perangkat tetap dilakukan menggunakan Arduino IDE.

---

# 2. Latar Belakang

Dalam pembelajaran pemrograman di laboratorium komputer, peserta didik melakukan praktik menggunakan komputer masing-masing. Kondisi tersebut menyebabkan guru sulit mengetahui aktivitas seluruh peserta didik secara bersamaan.

Guru biasanya perlu berkeliling dari satu komputer ke komputer lainnya untuk mengetahui apakah peserta didik sudah mulai mengerjakan, sedang menulis program, mengalami error, tidak melakukan aktivitas, atau telah menyelesaikan pekerjaannya.

Selain itu, apabila praktik dilakukan melalui editor lokal, aktivitas peserta didik hanya terlihat pada komputer masing-masing. Guru umumnya baru dapat melihat hasil pekerjaan ketika mendatangi komputer peserta didik atau setelah file dikumpulkan.

Penggunaan platform terpisah untuk menulis, menjalankan, dan mengumpulkan program juga berpotensi menambah langkah kerja peserta didik.

Oleh karena itu, diperlukan suatu lingkungan praktik pemrograman yang memungkinkan peserta didik melakukan proses coding dalam satu platform sekaligus memberikan visibilitas kepada guru terhadap proses praktik yang sedang berlangsung.

CodeMonitor dikembangkan untuk menjawab kebutuhan tersebut melalui integrasi **code editor, eksekusi program, autosave, activity monitoring, dan live code monitoring** dalam satu aplikasi berbasis web.

---

# 3. Problem Statement

> **Guru mengalami keterbatasan dalam memantau proses praktik pemrograman seluruh peserta didik secara bersamaan ketika peserta didik bekerja menggunakan komputer masing-masing.**

Guru membutuhkan cara yang lebih efisien untuk mengetahui peserta didik yang:

- belum mulai praktik;
- sedang menulis kode;
- sedang mencoba menjalankan program;
- mengalami error;
- tidak aktif dalam jangka waktu tertentu;
- dan telah menyelesaikan praktik.

Sementara itu, peserta didik membutuhkan lingkungan praktik yang memungkinkan proses menulis, menjalankan, memperbaiki, dan mengumpulkan kode dilakukan dalam satu tempat.

---

# 4. Product Goals

### Tujuan utama

Membantu guru melakukan pemantauan dan pendampingan terhadap proses praktik pemrograman peserta didik secara lebih efisien.

### Tujuan khusus

CodeMonitor harus memungkinkan:

1. Guru membuat dan mengelola kelas.
2. Peserta didik bergabung ke kelas.
3. Guru membuat sesi praktik.
4. Peserta didik menulis kode.
5. Kode tersimpan otomatis.
6. Peserta didik menjalankan program Python.
7. Peserta didik melihat output dan error program.
8. Guru mengetahui status aktivitas peserta didik.
9. Guru melihat kode terbaru peserta didik.
10. Guru mengetahui aktivitas _Run_ peserta didik.
11. Peserta didik mengumpulkan pekerjaannya.
12. Kode setiap peserta didik terlindungi dari peserta didik lain.

---

# 5. Product Principles

Pengembangan CodeMonitor mengikuti empat prinsip.

### 5.1 Individual Coding

Setiap peserta didik memiliki workspace sendiri.

```text id="0m3teo"
Siswa A ──→ Workspace A
Siswa B ──→ Workspace B
Siswa C ──→ Workspace C
```

Peserta didik tidak dapat melihat workspace temannya.

### 5.2 Teacher Visibility

Guru mendapatkan gambaran aktivitas seluruh kelas tanpa harus membuka komputer siswa satu per satu.

### 5.3 Learning through Practice

Platform mendukung siklus:

```text id="7x5z9m"
Menulis
   ↓
Menjalankan
   ↓
Melihat hasil
   ↓
Menemukan error
   ↓
Memperbaiki
   ↓
Menjalankan kembali
```

### 5.4 Monitoring for Assistance

Data monitoring digunakan sebagai **indikator bagi guru untuk menentukan peserta didik yang membutuhkan perhatian atau pendampingan**, bukan sebagai penilaian otomatis kemampuan peserta didik.

---

# 6. Target Users

## 6.1 Guru

Guru Informatika atau guru mata pelajaran yang melaksanakan pembelajaran pemrograman di SMK.

**User need:**

> Saya ingin mengetahui perkembangan praktik coding setiap siswa tanpa harus memeriksa seluruh komputer satu per satu.

## 6.2 Peserta Didik

Peserta didik SMK yang mengikuti praktik pemrograman.

**User need:**

> Saya ingin menulis, mencoba, memperbaiki, dan mengumpulkan program dalam satu tempat.

---

# 7. User Roles & Permissions

| Kemampuan               | Guru | Siswa |
| ----------------------- | :--: | :---: |
| Login                   |  ✓   |   ✓   |
| Membuat kelas           |  ✓   |   —   |
| Bergabung kelas         |  —   |   ✓   |
| Membuat sesi            |  ✓   |   —   |
| Melihat daftar siswa    |  ✓   |   —   |
| Menulis kode            |  —   |   ✓   |
| Menjalankan Python      |  —   |   ✓   |
| Melihat output          |  —   |   ✓   |
| Melihat kode sendiri    |  —   |   ✓   |
| Melihat kode siswa lain | ✓\*  |   ✕   |
| Monitoring aktivitas    |  ✓   |   —   |
| Submit                  |  —   |   ✓   |

`*` Guru hanya dapat melihat kode peserta didik yang berada di kelas yang diampunya.

---

# 8. User Flow — Guru

```text id="b8b24n"
Login
  ↓
Dashboard
  ↓
Buat / Pilih Kelas
  ↓
Bagikan Kode Kelas
  ↓
Siswa Bergabung
  ↓
Buat Sesi Praktik
  ↓
Pilih Bahasa
  ↓
Aktifkan Sesi
  ↓
Live Classroom Monitor
  ↓
Pilih Siswa
  ↓
Live Code Viewer
```

---

# 9. User Flow — Siswa

```text id="py6yvx"
Login
  ↓
Gabung / Pilih Kelas
  ↓
Pilih Sesi Praktik
  ↓
Baca Instruksi
  ↓
Code Editor
  ↓
Menulis Kode
  ↓
Autosave
  ↓
Run
  ↓
Output / Error
  ↓
Perbaiki
  ↓
Run kembali
  ↓
Submit
```

---

# 10. F01 — Authentication & Authorization

Pengguna harus melakukan autentikasi sebelum mengakses platform.

Role:

```text id="0n7rtz"
teacher
student
```

Data profil minimum:

```text id="o5trhm"
id
name
email
role
```

### Acceptance Criteria

- Pengguna dapat login.
- Role pengguna dapat dikenali sistem.
- Guru diarahkan ke dashboard guru.
- Siswa diarahkan ke dashboard siswa.
- Halaman yang tidak sesuai role tidak dapat diakses.

---

# 11. F02 — Classroom Management

Guru dapat membuat kelas.

Contoh:

> **X Teknik Elektronika 1**

Setiap kelas mendapatkan kode unik:

> **ELX7K2**

Siswa memasukkan kode tersebut untuk bergabung.

### Acceptance Criteria

- Guru dapat membuat kelas.
- Sistem menghasilkan kode kelas unik.
- Siswa dapat bergabung menggunakan kode.
- Guru dapat melihat anggota kelas.
- Kode tidak valid ditolak.
- Siswa tidak dapat melihat kelas yang tidak diikutinya.

---

# 12. F03 — Practice Session Management

Guru dapat membuat sesi praktik.

Data:

```text id="0z30bn"
title
instructions
language
class_id
status
```

Bahasa MVP:

```text id="a4e9mb"
Python
Arduino/C++
```

Status sesi:

```text id="h18ugm"
Draft
Active
Closed
```

Contoh:

> **Praktik 3 — Percabangan Python**

> Buat program untuk menentukan kondisi suhu berdasarkan input pengguna.

### Acceptance Criteria

- Guru dapat membuat sesi.
- Guru dapat memberikan instruksi.
- Guru dapat menentukan bahasa.
- Guru dapat mengaktifkan/menutup sesi.
- Hanya siswa dalam kelas terkait yang dapat mengakses sesi.

---

# 13. F04 — Code Editor

Code editor menggunakan **Monaco Editor**.

Untuk Python:

```python id="9pt95k"
suhu = float(input("Masukkan suhu: "))

if suhu > 35:
    print("Bahaya")
else:
    print("Normal")
```

Untuk Arduino:

```cpp id="umffz4"
void setup() {
    pinMode(13, OUTPUT);
}

void loop() {
    digitalWrite(13, HIGH);
}
```

### Requirement

Editor harus mendukung:

- syntax highlighting Python;
- syntax highlighting C/C++;
- line number;
- indentation;
- basic editor shortcuts;
- autosave indicator.

### Acceptance Criteria

- Siswa dapat menulis kode.
- Syntax highlighting sesuai bahasa.
- Kode yang telah tersimpan tetap tersedia setelah reload.
- Siswa hanya dapat mengakses submission miliknya.

---

# 14. F05 — Autosave

Kode siswa disimpan otomatis.

Tidak melakukan request pada setiap keystroke.

Gunakan **debounce**:

```text id="0fvl9n"
Mengetik
   ↓
Berhenti ±1–2 detik
   ↓
Autosave
   ↓
Database
```

UI menampilkan:

> ● Menyimpan...

kemudian:

> ✓ Tersimpan

Data:

```text id="ky29ou"
code
updated_at
last_activity_at
change_count
```

### Acceptance Criteria

- Kode tersimpan tanpa tombol Save.
- Autosave tidak dilakukan setiap keystroke.
- Status penyimpanan terlihat.
- Kode tidak hilang setelah reload jika sudah berhasil disimpan.

---

# 15. F06 — Python Code Runner

Untuk sesi berbahasa Python, siswa dapat menjalankan kode langsung dari browser.

Engine:

> **Pyodide / Python WebAssembly**

Kode dieksekusi pada browser siswa, bukan server CodeMonitor.

Alur:

```text id="8iwpdu"
Monaco Editor
      ↓
   [▶ Run]
      ↓
    Pyodide
      ↓
 ┌────┴─────┐
 ↓          ↓
Output     Error
```

### Terminal

UI:

```text id="lvhgjy"
TERMINAL

> Masukkan suhu: 37
> Bahaya
```

Jika terjadi error:

```text id="zbd2gt"
SyntaxError:
expected ':' at line 3
```

### Input

Program sederhana menggunakan:

```python id="vax0mr"
input()
```

harus dapat menerima input pengguna.

### Requirement

- Run Python.
- Capture `stdout`.
- Capture `stderr`.
- Mendukung `input()`.
- Menampilkan runtime/syntax error.
- Mencegah program berjalan tanpa batas.
- Menyediakan tombol Stop jika diperlukan.

### Acceptance Criteria

- Program Python sederhana dapat dijalankan.
- `print()` muncul pada terminal.
- `input()` dapat digunakan.
- Error dapat ditampilkan.
- Siswa dapat menjalankan program berkali-kali.
- Program bermasalah dapat dihentikan.

---

# 16. F07 — Arduino/C++ Workflow

Arduino/C++ tersedia sebagai editor dan workspace monitoring.

CodeMonitor **tidak melakukan compile atau upload Arduino pada MVP**.

Alur:

```text id="3q5hwg"
CodeMonitor
    ↓
Menulis kode
    ↓
Autosave
    ↓
Monitoring Guru
    ↓
Copy kode final
    ↓
Arduino IDE
    ↓
Compile
    ↓
Upload Hardware
```

### Acceptance Criteria

- Arduino/C++ memiliki syntax highlighting.
- Kode tersimpan otomatis.
- Guru dapat melihat kode.
- Siswa dapat menyalin kode untuk digunakan pada Arduino IDE.

---

# 17. F08 — Activity Tracking

Sistem mencatat metadata proses praktik.

Minimal:

```text id="z0ab1e"
started_at
last_activity_at
change_count
run_count
last_run_at
last_run_status
submitted_at
```

`last_run_status`:

```text id="zgq9s6"
success
error
```

Untuk Arduino yang tidak memiliki Run:

```text id="yqm2fi"
run_count = null
last_run_status = null
```

---

# 18. F09 — Live Classroom Monitor

Ini merupakan **fitur utama CodeMonitor dari sisi guru**.

Contoh:

```text id="94d7d5"
PRAKTIK 3 — PERCABANGAN

32 Siswa

┌─────────────────────────────────────────────┐
│ Andi     🟢 Coding        Run 7×   Success │
│ Budi     🔴 Error         Run 4×   Error   │
│ Citra    ⚪ Belum Mulai   Run 0×           │
│ Dimas    🟡 Tidak Aktif   Run 3×           │
│ Eka      ✅ Submitted     Run 8×   Success │
└─────────────────────────────────────────────┘
```

### Status utama

**⚪ Belum Mulai**

Belum terdapat aktivitas kode.

**🟢 Aktif/Coding**

Terdapat aktivitas coding baru-baru ini.

**🟡 Tidak Aktif**

Sudah mulai tetapi tidak terdapat aktivitas dalam periode tertentu.

**🔴 Last Run Error**

Percobaan Run terakhir menghasilkan error.

**✅ Submitted**

Pekerjaan telah dikumpulkan.

Status error sebaiknya diperlakukan sebagai **informasi tambahan**, bukan menggantikan seluruh status aktivitas.

Contohnya:

> 🟢 Aktif · 🔴 Last Run Error

lebih akurat daripada menyimpulkan siswa hanya berstatus "Error".

---

# 19. F10 — Live Code Viewer

Guru dapat membuka pekerjaan seorang siswa.

```text id="mwdmft"
ANDI PRATAMA

🟢 Aktif
Run: 7×
Last Run: ✓ Success
Changes: 24

──────────────────────────────

1 │ suhu = float(input("Suhu: "))
2 │
3 │ if suhu > 35:
4 │     print("Bahaya")
5 │ else:
6 │     print("Normal")

──────────────────────────────

READ ONLY
```

Perubahan terbaru dikirim melalui **Supabase Realtime**.

### Acceptance Criteria

- Guru dapat melihat kode siswa.
- Editor guru bersifat read-only.
- Update terbaru muncul tanpa refresh manual.
- Guru hanya dapat melihat siswa di kelasnya.

---

# 20. F11 — Submission

Siswa dapat menekan:

> **Kirim Pekerjaan**

Sebelum submit:

```text id="4bpvlp"
Pastikan pekerjaan Anda sudah selesai.

[Kembali] [Kirim]
```

Sistem memastikan kode terakhir tersimpan.

Kemudian:

```text id="4cw0zz"
status = submitted
submitted_at = timestamp
```

Untuk MVP, submission menjadi **read-only** setelah dikirim.

### Acceptance Criteria

- Siswa dapat submit.
- Autosave terakhir dilakukan sebelum submit.
- Waktu submission dicatat.
- Status guru diperbarui.
- Submission terkunci setelah berhasil dikirim.

---

# 21. Classroom Dashboard

Guru harus dapat memahami kondisi kelas dengan cepat.

```text id="wm1o46"
┌─────────────────────────────────────────────────┐
│ CodeMonitor                     Pak Rayhan      │
├───────────────┬─────────────────────────────────┤
│ Dashboard     │ Praktik Percabangan             │
│ Kelas         │                                 │
│               │ 32 Siswa                        │
│               │                                 │
│               │ 🟢 20 Aktif                     │
│               │ 🟡  4 Tidak Aktif               │
│               │ ⚪  3 Belum Mulai               │
│               │ ✅  5 Submitted                 │
│               │                                 │
│               │ [Semua] [Aktif] [Belum Mulai]  │
│               │                                 │
│               │ Andi    🟢  Run 7×  ✓           │
│               │ Budi    🟢  Run 5×  ⚠ Error    │
│               │ Citra   ⚪  Run 0×              │
└───────────────┴─────────────────────────────────┘
```

---

# 22. Database Model

### `profiles`

```text id="7i88ax"
id
name
email
role
created_at
```

### `classes`

```text id="7mt2vo"
id
name
class_code
teacher_id
created_at
```

### `class_members`

```text id="ngdrmk"
id
class_id
student_id
joined_at
```

### `practice_sessions`

```text id="n1qgh8"
id
class_id
title
instructions
language
status
created_at
```

### `submissions`

```text id="wm1r97"
id
session_id
student_id

code
status

started_at
last_activity_at

change_count

run_count
last_run_at
last_run_status

updated_at
submitted_at
```

---

# 23. Realtime Architecture

Tidak perlu mengirim setiap tombol keyboard kepada guru.

Gunakan:

```text id="6rxv5p"
STUDENT

Monaco
   │
   │ debounce
   ▼
Autosave
   │
   ▼
Supabase
   │
   │ Realtime
   ▼
Teacher Dashboard
```

Misalnya siswa mengetik 50 karakter dalam lima detik.

Bukan:

> 50 realtime database updates.

Tetapi mungkin hanya:

> 2–3 autosave updates.

Ini lebih efisien.

---

# 24. Security & Privacy

## Siswa

Diperbolehkan:

```text id="7ipf9k"
READ  own_submission
UPDATE own_submission
```

Dilarang:

```text id="zwws8q"
READ  other_student_submission
UPDATE other_student_submission
```

## Guru

Diperbolehkan:

```text id="y3ohqa"
READ submissions
WHERE class.teacher_id = current_user
```

Guru tidak boleh membaca submission kelas yang bukan miliknya.

Implementasi menggunakan:

> **Supabase Row Level Security (RLS)**

Security tidak boleh hanya bergantung pada frontend.

---

# 25. Tech Stack

| Layer          | Teknologi          |
| -------------- | ------------------ |
| Frontend       | React + TypeScript |
| Styling        | Tailwind CSS       |
| Code Editor    | Monaco Editor      |
| Python Runtime | Pyodide            |
| Backend        | Supabase           |
| Database       | PostgreSQL         |
| Authentication | Supabase Auth      |
| Realtime       | Supabase Realtime  |
| Authorization  | Supabase RLS       |
| Deployment     | Vercel             |

Arsitektur:

```text id="mv2p80"
                 CodeMonitor
                      │
             React + TypeScript
                      │
       ┌──────────────┴─────────────┐
       │                            │
    STUDENT                      TEACHER
       │                            │
 Monaco Editor               Live Dashboard
       │                            │
       ├── Python ──→ Pyodide      │
       │                            │
       └──────────┬─────────────────┘
                  │
               Supabase
       ┌──────────┼──────────┐
       │          │          │
      Auth    PostgreSQL   Realtime
```

---

# 26. Pages

## Public

```text id="o0mbwk"
/login
/register
```

## Teacher

```text id="g7czxm"
/teacher
/teacher/classes
/teacher/classes/:classId
/teacher/sessions/:sessionId
/teacher/sessions/:sessionId/students/:studentId
```

## Student

```text id="pwtjvp"
/student
/student/classes/:classId
/student/practice/:sessionId
```

---

# 27. Functional Priority

## MUST — MVP

**Account & Classroom**

- Authentication
- Teacher/student role
- Create class
- Join class

**Practice**

- Create practice session
- Python/Arduino language selection
- Monaco Editor
- Autosave

**Python**

- Run
- Output
- Input
- Error handling
- Stop execution

**Monitoring**

- Activity tracking
- Live classroom dashboard
- Live code viewer
- Run count/status
- Realtime updates

**Submission**

- Submit
- Submission lock

**Security**

- Row Level Security
- Student code isolation

---

## SHOULD

Jika waktu masih tersedia:

- Search siswa
- Filter status
- Reopen submission
- Duplicate practice
- Full-screen editor
- Download/copy code
- Timestamp aktivitas lebih detail

---

## COULD — Future Development

- Feedback guru pada kode
- Code version history
- Automatic testing
- Automatic grading
- Analytics
- Export submission
- Student "Minta Bantuan"
- Teacher notification
- Multiple source files
- Arduino compile checking
- AI code feedback

---

# 28. Non-Goals MVP

Tidak dikembangkan pada MVP:

❌ AI coding assistant  
❌ Plagiarism detector  
❌ Chat  
❌ Collaborative coding siswa  
❌ LMS lengkap  
❌ Arduino simulator  
❌ Upload langsung ke Arduino  
❌ Automatic grading  
❌ Leaderboard  
❌ Video conference

Tujuannya agar CodeMonitor tetap fokus pada:

> **Coding + Running + Monitoring + Submission**

---

# 29. Success Metrics

## 29.1 Technical Success

Produk berhasil apabila:

- siswa dapat masuk ke sesi praktik;
- editor dapat digunakan;
- autosave bekerja;
- Python dapat dijalankan;
- output/error tampil;
- guru menerima update aktivitas;
- guru dapat melihat kode siswa;
- kode siswa tidak dapat diakses siswa lain;
- submission dapat dilakukan.

## 29.2 Educational/Usability Success

Uji coba dapat melihat:

### Keterpantauan

Apakah guru lebih mudah mengetahui siswa yang sudah/belum melakukan praktik?

### Efisiensi

Apakah guru lebih cepat menemukan siswa yang membutuhkan pendampingan?

### Keterlibatan

Berapa peserta didik yang melakukan aktivitas coding dan mencoba menjalankan program?

### Kepraktisan

Bagaimana respons guru dan peserta didik terhadap penggunaan platform?

### Pengalaman praktik

Apakah integrasi editor dan Python Runner mempermudah proses:

> menulis → mencoba → memperbaiki program?

---

# 30. Monitoring Interpretation

Data seperti:

> `change_count = 30`

atau:

> `run_count = 8`

**tidak berarti siswa otomatis memahami materi.**

Demikian pula:

> `run_count = 1`

tidak berarti siswa tidak belajar.

Data CodeMonitor merupakan **indikator aktivitas** yang membantu guru menentukan peserta didik yang mungkin membutuhkan perhatian.

Penilaian kompetensi tetap dilakukan guru berdasarkan hasil pekerjaan, asesmen, observasi, dan proses pembelajaran.

---

# 31. MVP Test Scenario

Sebelum produk digunakan pada siswa, skenario berikut harus berhasil:

```text id="h8k2n4"
GURU
 │
 ├── Login
 ├── Buat kelas
 ├── Buat sesi Python
 └── Aktifkan sesi
          │
          ▼
       SISWA
          │
          ├── Login
          ├── Join kelas
          ├── Buka sesi
          ├── Menulis Python
          ├── Autosave
          ├── Run
          ├── Mendapat error
          ├── Memperbaiki kode
          ├── Run kembali
          └── Berhasil
                 │
                 ▼
              GURU
                 │
                 ├── Melihat siswa aktif
                 ├── Melihat Run count
                 ├── Melihat status Run
                 └── Melihat kode terbaru
                         │
                         ▼
                      SISWA
                         │
                         └── Submit
                                │
                                ▼
                             GURU
                                │
                                └── Status Submitted
```

---

# 32. Definition of Done

**CodeMonitor MVP 1.0 dianggap selesai ketika:**

> Seorang guru dapat membuat kelas dan sesi praktik, siswa dapat bergabung dan menulis program secara individual, kode tersimpan otomatis, siswa dapat menjalankan program Python dan melihat hasil/error, guru dapat memonitor aktivitas serta kode terbaru seluruh siswa secara real-time, siswa tidak dapat melihat kode siswa lain, dan pekerjaan dapat dikumpulkan setelah selesai.
