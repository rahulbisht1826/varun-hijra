import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getAIMove(board: (string | null)[], difficulty: 'easy' | 'medium' | 'hard') {
  const prompt = `
    You are a Tic Tac Toe expert. 
    Current board state (index 0-8, top-left to bottom-right):
    ${board.map((cell, i) => `${i}: ${cell || 'empty'}`).join(', ')}
    
    You are playing as 'O'. 'X' is the opponent.
    Difficulty level: ${difficulty}.
    
    Rules for difficulty:
    - easy: Make a random valid move.
    - medium: Try to block the opponent or win if possible, otherwise move strategically.
    - hard: Play optimally to never lose.
    
    Return the index (0-8) of your next move.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            move: {
              type: Type.INTEGER,
              description: "The index (0-8) of the chosen move.",
            },
            reasoning: {
              type: Type.STRING,
              description: "Brief explanation of the move.",
            }
          },
          required: ["move"],
        },
      },
    });

    const result = JSON.parse(response.text);
    return result.move as number;
  } catch (error) {
    console.error("Gemini AI Move Error:", error);
    // Fallback to random move if AI fails
    const availableMoves = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }
}
