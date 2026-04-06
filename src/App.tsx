/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Loader2, Mic2, Radio, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface QuestionData {
  question: string;
  answer: string;
  explanation: string;
}

interface EmissionData {
  introduction: string;
  questions: QuestionData[];
  conclusion: string;
}

function QuestionCard({ data, index }: { data: QuestionData; index: number }) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6"
    >
      <div className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red font-serif font-bold text-xl">
            {index + 1}
          </div>
          <div className="flex-1">
            <h3 className="text-xl md:text-2xl font-serif font-medium text-brand-dark leading-snug mb-4">
              {data.question}
            </h3>
            
            <button
              onClick={() => setIsRevealed(!isRevealed)}
              className="flex items-center gap-2 text-brand-accent font-medium hover:text-brand-dark transition-colors"
            >
              {isRevealed ? (
                <>Masquer la réponse <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Voir la réponse <ChevronDown className="w-4 h-4" /></>
              )}
            </button>

            <AnimatePresence>
              {isRevealed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 mt-6 border-t border-gray-100">
                    <div className="inline-block px-3 py-1 bg-brand-light text-brand-dark rounded-full text-sm font-semibold mb-3">
                      La réponse : {data.answer}
                    </div>
                    <p className="text-gray-700 leading-relaxed italic">
                      "{data.explanation}"
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [day, setDay] = useState('1');
  const [month, setMonth] = useState('janvier');
  const [level, setLevel] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [emissionData, setEmissionData] = useState<EmissionData | null>(null);
  const [error, setError] = useState('');

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];

  const generateEmission = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError('');
    setEmissionData(null);

    try {
      let levelInstruction = "";
      if (level === "1") {
        levelInstruction = "Niveau 1 (Amateur éclairé) : Les questions ne doivent pas être évidentes. Elles nécessitent une solide culture générale. Porte sur des faits historiques ou des personnalités connues liés à cette date, mais demande un détail précis (aucune question basique).";
      } else if (level === "2") {
        levelInstruction = "Niveau 2 (Expert) : Les questions doivent être difficiles et pointues. Fais appel à des anecdotes historiques méconnues, des citations spécifiques, ou des détails surprenants liés à l'éphéméride de cette date.";
      } else if (level === "3") {
        levelInstruction = "Niveau 3 (Maître des Grosses Têtes) : Les questions doivent être extrêmement difficiles, tordues et quasi-introuvables du premier coup sans indices. Utilise des liens très indirects, des détails historiques obscurs, ou des anecdotes très spécifiques en rapport lointain avec l'éphéméride.";
      }

      const prompt = `Tu es Laurent Ruquier, l'animateur de l'émission de radio française 'Les Grosses Têtes' sur RTL.
Génère une liste d'EXACTEMENT 6 questions de culture générale basées sur l'éphéméride du ${day} ${month}.

CONTRAINTE DE DIFFICULTÉ :
${levelInstruction}

Utilise des événements historiques, des naissances, des décès ou des saints liés à cette date.
Le ton doit être exactement celui de Laurent Ruquier : enjoué, cultivé, parfois moqueur, avec des jeux de mots, en t'adressant aux 'Grosses Têtes' (les pensionnaires).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              introduction: {
                type: Type.STRING,
                description: "Une phrase d'introduction de Laurent Ruquier pour présenter la date du jour."
              },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: {
                      type: Type.STRING,
                      description: "La question posée aux Grosses Têtes."
                    },
                    answer: {
                      type: Type.STRING,
                      description: "La réponse courte."
                    },
                    explanation: {
                      type: Type.STRING,
                      description: "L'explication détaillée donnée par Laurent Ruquier après que quelqu'un ait trouvé (ou non) la réponse, avec une anecdote."
                    }
                  },
                  required: ["question", "answer", "explanation"]
                }
              },
              conclusion: {
                type: Type.STRING,
                description: "Une phrase de conclusion pour clore cette série de questions."
              }
            },
            required: ["introduction", "questions", "conclusion"]
          }
        }
      });

      if (response.text) {
        const parsedData = JSON.parse(response.text) as EmissionData;
        setEmissionData(parsedData);
      } else {
        throw new Error("Pas de réponse générée.");
      }
    } catch (err) {
      console.error(err);
      setError("Désolé, un problème technique nous empêche de joindre le studio. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-[#1a1a1a] selection:bg-brand-red selection:text-white pb-20">
      {/* Header */}
      <header className="bg-brand-red text-white py-12 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] [background-size:20px_20px]"></div>
        </div>
        
        <div className="max-w-3xl mx-auto relative z-10 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white mb-6 shadow-lg"
          >
            <Mic2 className="w-8 h-8 text-brand-red" />
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4 tracking-tight">
            Le Générateur des<br />
            <span className="text-brand-dark italic">Grosses Têtes</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-light max-w-xl mx-auto">
            Sélectionnez une date et laissez Laurent Ruquier vous concocter une émission sur mesure sur RTL.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 -mt-8 relative z-20">
        {/* Input Form */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-12">
          <form onSubmit={generateEmission} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 sm:w-1/4">
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full pl-4 pr-10 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all outline-none text-lg appearance-none cursor-pointer font-medium"
                >
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative flex-1 sm:w-2/4">
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full pl-4 pr-10 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all outline-none text-lg appearance-none cursor-pointer font-medium"
                >
                  {months.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative flex-1 sm:w-1/4">
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full pl-4 pr-10 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 transition-all outline-none text-lg appearance-none cursor-pointer font-medium"
                >
                  <option value="1">Niveau 1 (Amateur)</option>
                  <option value="2">Niveau 2 (Expert)</option>
                  <option value="3">Niveau 3 (Maître)</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-brand-dark hover:bg-black text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto md:self-end"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> En studio...</>
              ) : (
                <><Radio className="w-5 h-5" /> À l'antenne</>
              )}
            </button>
          </form>
          {error && (
            <p className="text-red-500 mt-4 text-center">{error}</p>
          )}
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {emissionData && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-10">
                <Sparkles className="w-8 h-8 text-brand-accent mx-auto mb-4" />
                <p className="text-2xl font-serif text-brand-dark italic leading-relaxed">
                  "{emissionData.introduction}"
                </p>
              </div>

              <div className="space-y-6">
                {emissionData.questions.map((q, i) => (
                  <QuestionCard key={i} data={q} index={i} />
                ))}
              </div>

              <div className="mt-12 text-center p-8 bg-brand-dark text-white rounded-3xl">
                <p className="text-xl font-serif italic">
                  "{emissionData.conclusion}"
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
