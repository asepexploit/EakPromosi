/**
 * Translate low-level Telegram / GramJS errors into actionable Indonesian
 * messages for end users. Unknown errors fall back to the raw message so
 * the engineer debugging a report still has something to grep.
 *
 * Codes come from https://core.telegram.org/api/errors and GramJS's own
 * `errorMessage` field.
 */

export interface TranslatedError {
  /** User-facing Indonesian message. */
  message: string;
  /** Stable machine code for the UI (e.g. to show an upgrade modal). */
  code: string;
  /** True when the user can meaningfully retry (bad code, flood wait, etc). */
  retryable: boolean;
}

const EXACT: Record<string, { message: string; retryable: boolean }> = {
  API_ID_INVALID: {
    message:
      'Konfigurasi aplikasi Telegram tidak valid (API_ID_INVALID). Hubungi admin untuk mengisi TELEGRAM_API_ID dan TELEGRAM_API_HASH yang benar di .env server.',
    retryable: false,
  },
  API_ID_PUBLISHED_FLOOD: {
    message:
      'API_ID aplikasi Telegram sudah terlalu banyak dipakai publik. Buat api_id baru di my.telegram.org/apps dan ganti nilai di .env.',
    retryable: false,
  },
  PHONE_NUMBER_INVALID: {
    message: 'Nomor telepon tidak valid. Pastikan format diawali kode negara, contoh +62812…',
    retryable: true,
  },
  PHONE_NUMBER_BANNED: {
    message: 'Nomor ini telah diblokir Telegram dan tidak bisa dipakai sebagai akun userbot.',
    retryable: false,
  },
  PHONE_NUMBER_FLOOD: {
    message: 'Nomor ini terlalu sering mencoba login. Tunggu beberapa jam sebelum mencoba lagi.',
    retryable: true,
  },
  PHONE_NUMBER_OCCUPIED: {
    message: 'Nomor ini sudah dipakai akun lain. Hubungkan dengan nomor berbeda.',
    retryable: true,
  },
  PHONE_NUMBER_UNOCCUPIED: {
    message:
      'Nomor ini belum terdaftar di Telegram. Daftar lebih dulu via aplikasi Telegram resmi, baru hubungkan.',
    retryable: true,
  },
  PHONE_CODE_INVALID: {
    message: 'Kode verifikasi salah. Periksa kembali dan masukkan ulang.',
    retryable: true,
  },
  PHONE_CODE_EXPIRED: {
    message: 'Kode verifikasi sudah kedaluwarsa. Mulai ulang proses tambah akun.',
    retryable: true,
  },
  PHONE_CODE_EMPTY: {
    message: 'Kode verifikasi tidak boleh kosong.',
    retryable: true,
  },
  SESSION_PASSWORD_NEEDED: {
    message: 'Akun ini mengaktifkan 2FA. Masukkan password cloud Telegram Anda.',
    retryable: true,
  },
  PASSWORD_HASH_INVALID: {
    message: 'Password 2FA salah. Masukkan ulang password cloud Telegram.',
    retryable: true,
  },
  AUTH_RESTART: {
    message: 'Telegram meminta login diulang. Mulai ulang proses tambah akun.',
    retryable: true,
  },
  AUTH_USER_CANCEL: {
    message: 'Login dibatalkan.',
    retryable: true,
  },
  AUTH_KEY_UNREGISTERED: {
    message: 'Sesi akun tidak dikenal lagi oleh Telegram. Hubungkan ulang akun ini.',
    retryable: false,
  },
  USER_DEACTIVATED: {
    message: 'Akun ini telah dinonaktifkan di Telegram.',
    retryable: false,
  },
  USER_DEACTIVATED_BAN: {
    message: 'Akun ini telah dibanned oleh Telegram.',
    retryable: false,
  },
  PHONE_PASSWORD_FLOOD: {
    message:
      'Terlalu banyak percobaan password 2FA. Telegram mengunci sementara — tunggu beberapa jam sebelum mencoba lagi.',
    retryable: true,
  },
  PHONE_PASSWORD_PROTECTED: {
    message: 'Nomor ini dilindungi password 2FA. Masukkan password cloud Telegram.',
    retryable: true,
  },
  TIMEOUT: {
    message: 'Telegram tidak merespons (timeout jaringan). Coba lagi beberapa saat.',
    retryable: true,
  },
};

/** Match for `FLOOD_WAIT_42` → 42 seconds. */
const FLOOD_RE = /^FLOOD_WAIT_(\d+)$/;

export function translateTelegramError(err: unknown): TranslatedError {
  const raw = extractCode(err);

  if (raw) {
    const flood = raw.match(FLOOD_RE);
    if (flood) {
      const secs = Number(flood[1]);
      return {
        code: 'FLOOD_WAIT',
        message:
          secs >= 3600
            ? `Telegram meminta jeda ${Math.ceil(secs / 3600)} jam sebelum mencoba login lagi.`
            : `Telegram meminta jeda ${secs} detik sebelum mencoba login lagi.`,
        retryable: true,
      };
    }
    const hit = EXACT[raw];
    if (hit) return { code: raw, message: hit.message, retryable: hit.retryable };
  }

  // Login-flow helper timeouts (we throw these ourselves in login-flow.ts).
  const msg = (err instanceof Error ? err.message : String(err)) ?? '';
  if (msg.includes('login flow timeout')) {
    return {
      code: 'LOGIN_TIMEOUT',
      message: 'Timeout menunggu kode / password dari Anda. Mulai ulang proses tambah akun.',
      retryable: true,
    };
  }
  // GramJS throws plain Error("Code is empty") when the phoneCode callback
  // resolves with an empty string. Happens when a stale start-job's waitCode
  // picks up the delete after another start-job already consumed the real code.
  if (msg.toLowerCase().includes('code is empty')) {
    return {
      code: 'PHONE_CODE_EMPTY',
      message:
        'Kode OTP tidak terbaca worker (kemungkinan ada sesi login lama yang masih berjalan). Mulai ulang proses tambah akun.',
      retryable: true,
    };
  }
  if (msg.toLowerCase().includes('password is empty')) {
    return {
      code: 'PASSWORD_EMPTY',
      message: 'Password 2FA kosong. Masukkan password cloud Telegram Anda.',
      retryable: true,
    };
  }
  if (msg.toLowerCase().includes('canceled by newer attempt')) {
    return {
      code: 'AUTH_USER_CANCEL',
      message: 'Login dibatalkan karena ada upaya login baru.',
      retryable: true,
    };
  }
  // Generic network / connection errors from the GramJS transport layer.
  const lower = msg.toLowerCase();
  if (
    lower.includes('econnrefused') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('enotfound') ||
    lower.includes('socket hang up') ||
    lower.includes('network error') ||
    lower.includes('not connected')
  ) {
    return {
      code: 'NETWORK',
      message: 'Tidak bisa menghubungi server Telegram (masalah jaringan). Coba lagi beberapa saat.',
      retryable: true,
    };
  }

  // Fallback: show the raw error so an engineer tailing logs still has a clue.
  return {
    code: raw ?? 'UNKNOWN',
    message: msg || 'Terjadi kesalahan tak dikenal saat login Telegram. Coba lagi, atau hubungi admin.',
    retryable: false,
  };
}

function extractCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const anyErr = err as { errorMessage?: unknown; message?: unknown; code?: unknown };
  if (typeof anyErr.errorMessage === 'string') return anyErr.errorMessage;
  if (typeof anyErr.message === 'string') {
    // Try to pull out `UPPER_SNAKE` tokens from GramJS messages like
    // "400: PHONE_CODE_INVALID (caused by auth.SignIn)"
    const m = anyErr.message.match(/\b([A-Z][A-Z0-9_]{3,})\b/);
    if (m && m[1]) return m[1];
  }
  return null;
}
