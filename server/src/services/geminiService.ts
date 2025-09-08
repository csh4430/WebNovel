import { GoogleGenerativeAI } from '@google/generative-ai';
import { openDb } from '../lib/db';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// DB에서 특정 소설의 용어집(glossary)을 가져오는 함수
async function getGlossaryForNovel(novelId: number, targetLang: string) {
  const db = await openDb();
  const glossaryTerms = await db.all(
    'SELECT original_term, translated_term FROM glossary WHERE novel_id = ? AND target_lang = ?',
    [novelId, targetLang]
  );
  await db.close();
  return glossaryTerms;
}

// DB에서 특정 소설의 캐릭터 정보를 가져오는 함수
async function getCharactersForNovel(novelId: number) {
  const db = await openDb();
  const characters = await db.all(
    'SELECT name, description FROM characters WHERE novel_id = ?',
    [novelId]
  );
  await db.close();
  return characters;
}

// 번역을 위한 프롬프트를 동적으로 생성하는 함수
async function buildPrompt(textToTranslate: string, targetLanguage: string, novelId: number) {
    const glossary = await getGlossaryForNovel(novelId, targetLanguage);
    let glossary_rules = "This novel has no specific glossary. Translate terms as you see fit.";

    if (glossary.length > 0) {
        const terms = glossary.map(g => `- '${g.original_term}' must be translated as '${g.translated_term}'`).join('\n');
        glossary_rules = `
        Glossary Rules:
        You MUST adhere to the following glossary terms for this novel:
        ${terms}
        `;
    }
    
    const characters = await getCharactersForNovel(novelId);
    let character_sheet = "No specific character info provided.";

    if (characters.length > 0) {
        const characterDescriptions = characters
            .map(c => `- ${c.name}: ${c.description}`)
            .join('\n');
        character_sheet = `
        # Character Sheet
        ${characterDescriptions}
        `;
    }
    
    const scene_context = `# Scene Context\n- (Currently unspecified)`;

    return `
    You are an expert transcreator, adapting Japanese web novels for a modern web novel audience in the target language: **${targetLanguage}**.
    Your goal is not a literal translation but a stylistic adaptation. The final text must read as if it were originally written by a popular web novel author in that language.

    Follow these critical principles of transcreation:
    1.  **Convert Symbolic Pauses and Gasps into Descriptive Prose:** Describe the character's action or internal state.
    2.  **Amplify Inner Monologue:** Expand parenthetical thoughts into more explicit inner monologues.
    3.  **Adjust for Vertical Rhythm:** Break down long paragraphs for mobile reading.
    4.  **Preserve Natural Formatting:** Maintain the original's paragraph breaks and create a natural flow.

    The following are examples of transforming Japanese into Korean to illustrate the *principle* of transcreation. Apply these same *principles* when translating into **${targetLanguage}**.
    -   **Principle Example 1 (Gasp):** Original (JP): 「なっ。。。！」 -> Transcreated (KO): 그는 순간 숨을 삼켰다. "뭐라고...!"
    -   **Principle Example 2 (Inner Thought):** Original (JP): 彼は頷いた。（面倒なことになった） -> Transcreated (KO): 그는 겉으로 고개를 끄덕였지만, 속으로는 욕설을 삼켰다. '젠장, 제대로 꼬여버렸군.'

    Context for Transcreation:
    ${character_sheet}
    ${scene_context}
    ${glossary_rules}

    Following all the principles and examples above, transcreate the following Japanese text into a natural **${targetLanguage}** web novel style:
    ---
    ${textToTranslate}
    `;
}

// 스트리밍 번역 함수
export async function transcreateWithGeminiStream(
  textToTranslate: string,
  targetLanguage: string,
  novelId: number
) {
  if (!textToTranslate) {
    throw new Error("번역할 텍스트가 없습니다.");
  }
  const prompt = await buildPrompt(textToTranslate, targetLanguage, novelId);
  
  try {
    const result = await model.generateContentStream(prompt);
    return result.stream;
  } catch (error) {
    console.error('Gemini API 스트리밍 에러:', error);
    throw new Error('Gemini 스트리밍에 실패했습니다.');
  }
}