import type { RoomConfig, WordItem } from "./types";

export type WordSet = {
  id: string;
  name: string;
  emoji: string;
  words: WordItem[];
};

const w = (en: string, vi: string, emoji?: string): WordItem => ({
  en,
  vi,
  emoji,
});

export const WORD_SETS: WordSet[] = [
  {
    id: "animals",
    name: "Động vật",
    emoji: "🐼",
    words: [
      w("cat", "con mèo", "🐱"),
      w("dog", "con chó", "🐶"),
      w("bird", "con chim", "🐦"),
      w("fish", "con cá", "🐟"),
      w("rabbit", "con thỏ", "🐰"),
      w("tiger", "con hổ", "🐯"),
      w("lion", "con sư tử", "🦁"),
      w("elephant", "con voi", "🐘"),
      w("monkey", "con khỉ", "🐵"),
      w("horse", "con ngựa", "🐴"),
      w("cow", "con bò", "🐮"),
      w("pig", "con lợn", "🐷"),
      w("duck", "con vịt", "🦆"),
      w("chicken", "con gà", "🐔"),
      w("bear", "con gấu", "🐻"),
      w("snake", "con rắn", "🐍"),
      w("frog", "con ếch", "🐸"),
      w("panda", "gấu trúc", "🐼"),
      w("giraffe", "hươu cao cổ", "🦒"),
      w("zebra", "ngựa vằn", "🦓"),
    ],
  },
  {
    id: "food",
    name: "Đồ ăn & uống",
    emoji: "🍎",
    words: [
      w("apple", "quả táo", "🍎"),
      w("banana", "quả chuối", "🍌"),
      w("orange", "quả cam", "🍊"),
      w("grape", "quả nho", "🍇"),
      w("watermelon", "dưa hấu", "🍉"),
      w("strawberry", "dâu tây", "🍓"),
      w("bread", "bánh mì", "🍞"),
      w("rice", "cơm", "🍚"),
      w("egg", "quả trứng", "🥚"),
      w("milk", "sữa", "🥛"),
      w("water", "nước", "💧"),
      w("cake", "bánh ngọt", "🍰"),
      w("noodles", "mì sợi", "🍜"),
      w("cheese", "phô mai", "🧀"),
      w("carrot", "cà rốt", "🥕"),
      w("tomato", "cà chua", "🍅"),
      w("juice", "nước ép", "🧃"),
      w("candy", "kẹo", "🍬"),
      w("soup", "món súp", "🍲"),
      w("ice cream", "kem", "🍦"),
    ],
  },
  {
    id: "colors",
    name: "Màu sắc",
    emoji: "🌈",
    words: [
      w("red", "màu đỏ", "🔴"),
      w("blue", "màu xanh dương", "🔵"),
      w("green", "màu xanh lá", "🟢"),
      w("yellow", "màu vàng", "🟡"),
      w("orange", "màu cam", "🟠"),
      w("purple", "màu tím", "🟣"),
      w("pink", "màu hồng", "🌸"),
      w("black", "màu đen", "⚫"),
      w("white", "màu trắng", "⚪"),
      w("brown", "màu nâu", "🟤"),
      w("gray/grey", "màu xám", "🌫️"),
      w("gold", "màu vàng kim", "🥇"),
      w("silver", "màu bạc", "🥈"),
    ],
  },
  {
    id: "school",
    name: "Trường học",
    emoji: "🎒",
    words: [
      w("book", "quyển sách", "📚"),
      w("pen", "bút mực", "🖊️"),
      w("pencil", "bút chì", "✏️"),
      w("ruler", "thước kẻ", "📏"),
      w("bag", "cặp sách", "🎒"),
      w("desk", "bàn học", "🪑"),
      w("teacher", "giáo viên", "🧑‍🏫"),
      w("student", "học sinh", "🧑‍🎓"),
      w("school", "trường học", "🏫"),
      w("eraser", "cục tẩy", "🧽"),
      w("scissors", "cái kéo", "✂️"),
      w("notebook", "quyển vở", "📓"),
      w("computer", "máy tính", "💻"),
      w("map", "bản đồ", "🗺️"),
      w("clock", "đồng hồ", "🕒"),
      w("crayon", "bút sáp màu", "🖍️"),
    ],
  },
  {
    id: "family",
    name: "Gia đình",
    emoji: "👨‍👩‍👧",
    words: [
      w("mother", "mẹ", "👩"),
      w("father", "bố", "👨"),
      w("sister", "chị / em gái", "👧"),
      w("brother", "anh / em trai", "👦"),
      w("baby", "em bé", "👶"),
      w("grandmother", "bà", "👵"),
      w("grandfather", "ông", "👴"),
      w("family", "gia đình", "👨‍👩‍👧"),
      w("parents", "bố mẹ", "👫"),
      w("son", "con trai", "👦"),
      w("daughter", "con gái", "👧"),
      w("friend", "bạn bè", "🤝"),
    ],
  },
  {
    id: "body",
    name: "Cơ thể",
    emoji: "💪",
    words: [
      w("head", "cái đầu", "🙆"),
      w("eye", "con mắt", "👁️"),
      w("ear", "cái tai", "👂"),
      w("nose", "cái mũi", "👃"),
      w("mouth", "cái miệng", "👄"),
      w("hand", "bàn tay", "✋"),
      w("foot", "bàn chân", "🦶"),
      w("leg", "cái chân", "🦵"),
      w("arm", "cánh tay", "💪"),
      w("hair", "mái tóc", "💇"),
      w("tooth", "cái răng", "🦷"),
      w("finger", "ngón tay", "☝️"),
      w("face", "khuôn mặt", "🙂"),
      w("heart", "trái tim", "❤️"),
    ],
  },
  {
    id: "nature",
    name: "Thời tiết & thiên nhiên",
    emoji: "🌦️",
    words: [
      w("sun", "mặt trời", "☀️"),
      w("rain", "mưa", "🌧️"),
      w("cloud", "đám mây", "☁️"),
      w("snow", "tuyết", "❄️"),
      w("wind", "gió", "🌬️"),
      w("storm", "cơn bão", "⛈️"),
      w("rainbow", "cầu vồng", "🌈"),
      w("hot", "nóng", "🥵"),
      w("cold", "lạnh", "🥶"),
      w("moon", "mặt trăng", "🌙"),
      w("star", "ngôi sao", "⭐"),
      w("tree", "cái cây", "🌳"),
      w("flower", "bông hoa", "🌸"),
      w("mountain", "ngọn núi", "⛰️"),
      w("sea", "biển", "🌊"),
      w("river", "dòng sông", "🏞️"),
    ],
  },
  {
    id: "jobs",
    name: "Nghề nghiệp",
    emoji: "👩‍⚕️",
    words: [
      w("doctor", "bác sĩ", "🧑‍⚕️"),
      w("nurse", "y tá", "💉"),
      w("farmer", "nông dân", "🧑‍🌾"),
      w("cook", "đầu bếp", "🧑‍🍳"),
      w("singer", "ca sĩ", "🎤"),
      w("dancer", "vũ công", "💃"),
      w("pilot", "phi công", "🧑‍✈️"),
      w("police", "cảnh sát", "👮"),
      w("driver", "tài xế", "🚕"),
      w("artist", "họa sĩ", "🎨"),
      w("engineer", "kỹ sư", "🛠️"),
      w("firefighter", "lính cứu hỏa", "🧑‍🚒"),
      w("worker", "công nhân", "👷"),
      w("dentist", "nha sĩ", "🦷"),
      w("actor", "diễn viên", "🎬"),
      w("writer", "nhà văn", "✍️"),
    ],
  },
  {
    id: "verbs",
    name: "Động từ",
    emoji: "🏃",
    words: [
      w("run", "chạy", "🏃"),
      w("jump", "nhảy (bật lên)", "🦘"),
      w("swim", "bơi", "🏊"),
      w("dance", "nhảy múa", "💃"),
      w("sing", "hát", "🎤"),
      w("read", "đọc", "📖"),
      w("write", "viết", "✍️"),
      w("eat", "ăn", "🍽️"),
      w("drink", "uống", "🥤"),
      w("sleep", "ngủ", "😴"),
      w("play", "chơi", "🎮"),
      w("draw", "vẽ", "🎨"),
      w("walk", "đi bộ", "🚶"),
      w("listen", "nghe", "🎧"),
      w("speak", "nói", "🗣️"),
      w("laugh", "cười lớn", "😂"),
      w("cry", "khóc", "😢"),
      w("fly", "bay", "🕊️"),
      w("climb", "leo trèo", "🧗"),
      w("cook", "nấu ăn", "🍳"),
    ],
  },
  {
    id: "feelings",
    name: "Cảm xúc & tính từ",
    emoji: "😄",
    words: [
      w("happy", "vui vẻ", "😄"),
      w("sad", "buồn", "😢"),
      w("angry", "tức giận", "😠"),
      w("tired", "mệt mỏi", "😩"),
      w("hungry", "đói bụng", "🤤"),
      w("scared", "sợ hãi", "😱"),
      w("excited", "hào hứng", "🤩"),
      w("bored", "chán", "🥱"),
      w("surprised", "ngạc nhiên", "😲"),
      w("big", "to lớn", "🐘"),
      w("small", "nhỏ bé", "🐭"),
      w("fast", "nhanh", "⚡"),
      w("slow", "chậm", "🐢"),
      w("beautiful", "xinh đẹp", "🌺"),
      w("funny", "hài hước", "🤡"),
      w("kind", "tốt bụng", "🤗"),
      w("strong", "khỏe mạnh", "💪"),
      w("smart", "thông minh", "🧠"),
    ],
  },
  {
    id: "home",
    name: "Nhà cửa",
    emoji: "🏠",
    words: [
      w("house", "ngôi nhà", "🏠"),
      w("door", "cửa ra vào", "🚪"),
      w("window", "cửa sổ", "🪟"),
      w("bed", "cái giường", "🛏️"),
      w("kitchen", "nhà bếp", "🍳"),
      w("bathroom", "phòng tắm", "🛁"),
      w("sofa", "ghế sofa", "🛋️"),
      w("lamp", "cái đèn", "💡"),
      w("mirror", "cái gương", "🪞"),
      w("garden", "khu vườn", "🌻"),
      w("key", "chìa khóa", "🔑"),
      w("cup", "cái cốc", "☕"),
      w("plate", "cái đĩa", "🍽️"),
      w("spoon", "cái thìa", "🥄"),
      w("fork", "cái nĩa", "🍴"),
      w("television", "ti vi", "📺"),
    ],
  },
  {
    id: "transport",
    name: "Phương tiện",
    emoji: "🚌",
    words: [
      w("car", "ô tô", "🚗"),
      w("bus", "xe buýt", "🚌"),
      w("bike/bicycle", "xe đạp", "🚲"),
      w("train", "tàu hỏa", "🚆"),
      w("plane", "máy bay", "✈️"),
      w("boat", "con thuyền", "⛵"),
      w("ship", "tàu thủy", "🚢"),
      w("taxi", "xe taxi", "🚕"),
      w("truck", "xe tải", "🚚"),
      w("motorbike", "xe máy", "🏍️"),
      w("helicopter", "trực thăng", "🚁"),
      w("rocket", "tên lửa", "🚀"),
      w("subway", "tàu điện ngầm", "🚇"),
      w("scooter", "xe tay ga", "🛵"),
    ],
  },
];

export const ALL_WORDS_ID = "all";
export const CUSTOM_WORDS_ID = "custom";

export function wordSetLabel(id: string) {
  if (id === ALL_WORDS_ID) return "🎲 Trộn tất cả chủ đề";
  if (id === CUSTOM_WORDS_ID) return "✍️ Danh sách tự nhập";
  const set = WORD_SETS.find((s) => s.id === id);
  return set ? `${set.emoji} ${set.name}` : id;
}

export function isKnownWordSet(id: string) {
  return (
    id === ALL_WORDS_ID ||
    id === CUSTOM_WORDS_ID ||
    WORD_SETS.some((s) => s.id === id)
  );
}

export function getWordPool(
  config: Pick<RoomConfig, "wordSetId" | "customWords">
) {
  if (config.wordSetId === CUSTOM_WORDS_ID && config.customWords.length > 0) {
    return config.customWords;
  }
  if (config.wordSetId === ALL_WORDS_ID) {
    return WORD_SETS.flatMap((s) => s.words);
  }
  return (WORD_SETS.find((s) => s.id === config.wordSetId) ?? WORD_SETS[0])
    .words;
}

export function normalizeAnswer(value: string) {
  return value.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ").trim();
}

export function answersFor(word: WordItem) {
  return word.en
    .split("/")
    .map(normalizeAnswer)
    .filter((a) => a.length > 0);
}

/** The spelling shown to students (the first alternative). */
export function displayWord(word: WordItem) {
  return answersFor(word)[0] ?? normalizeAnswer(word.en);
}

export function isCorrectAnswer(typed: string, word: WordItem) {
  const value = normalizeAnswer(typed);
  return value.length > 0 && answersFor(word).includes(value);
}

/** True while what has been typed so far could still become a right answer. */
export function isPrefixOfAnswer(typed: string, word: WordItem) {
  const value = typed.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ");
  return answersFor(word).some((a) => a.startsWith(value.trimStart()));
}

export const MAX_CUSTOM_WORDS = 200;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function sanitizeWords(input: unknown): WordItem[] {
  if (!Array.isArray(input)) return [];
  const out: WordItem[] = [];
  for (const item of input.slice(0, MAX_CUSTOM_WORDS)) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const en = clean(raw.en, 40);
    if (!en || !/[a-z]/i.test(en)) continue;
    const vi = clean(raw.vi, 60);
    const emoji = clean(raw.emoji, 16) || undefined;
    out.push({ en, vi, emoji });
  }
  return out;
}

/**
 * Parses a teacher's list, one word per line:
 *   apple = quả táo
 *   banana - quả chuối - 🍌
 *   grey/gray: màu xám
 */
export function parseCustomWords(text: string): WordItem[] {
  const items: WordItem[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed
      .split(/\s*(?:=|\t|:|\||\s-\s|;)\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
    const [en, vi = "", emoji] = parts;
    if (!en) continue;
    items.push({ en, vi, emoji });
  }
  return sanitizeWords(items);
}

export function formatCustomWords(words: WordItem[]) {
  return words
    .map((x) => [x.en, x.vi, x.emoji].filter(Boolean).join(" = "))
    .join("\n");
}
