import procedures from '../data/knowledge/procedures.json' with { type: 'json' };
import { z } from 'zod';
export const KnowledgeInput = z
  .object({
    question: z.string().trim().min(5).max(1000),
    language: z.enum(['nl', 'fr']).default('nl'),
    native: z.boolean().default(false),
  })
  .strict();
export function retrieveProcedures(question: string, language: 'nl' | 'fr') {
  const words = question.toLocaleLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  const terms = words.flatMap((w) =>
    /verkocht|bezoek|afspraak|vendu|visite/.test(w)
      ? ['bezoek', 'visite', 'verkocht', 'vendu']
      : /crm|overdracht|herstel|pogingen/.test(w)
        ? ['crm', 'overdracht', 'herstel']
        : /fiche|document|ontbre|prijs/.test(w)
          ? ['fiche', 'basisveld', 'prijs']
          : [w],
  );
  const matches = procedures
    .filter((p) => p.state === 'current' && p.language === language)
    .map((p) => ({
      ...p,
      score: terms.filter((w) => (p.title + ' ' + p.text).toLowerCase().includes(w)).length,
    }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return {
    mode: 'local-exact-procedure-search',
    question,
    language,
    sources: matches.map((p) => ({
      source_id: p.id,
      title: p.title,
      version: p.version,
      quote: p.text,
    })),
    answer: matches.length
      ? matches.map((p) => p.text).join('\n\n')
      : 'Geen voldoende passende actuele procedure gevonden. Vraag een medewerker om verduidelijking.',
    requires_human: true,
  };
}
