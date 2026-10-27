// Rich-text structure follows the actual Dify 0.7.0 template export.
export type CanvasStep = {
  id: string;
  title: string;
  description: string;
  input: string;
  output: string;
  check: string;
};
export type CanvasGuide = {
  id: string;
  tool: string;
  title: string;
  subtitle: string;
  value: string;
  boundary: string;
  owner: string;
  failure: string;
  steps: CanvasStep[];
  tests: { label: string; input: string; expect: string; canvas?: string }[];
};
function richText(title: string, paragraphs: string[]) {
  const p = (text: string, bold = false) => ({
    children: [
      {
        detail: 0,
        format: bold ? 1 : 0,
        mode: 'normal',
        style: `font-size: ${bold ? 20 : 16}px;`,
        text,
        type: 'text',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1,
    textFormat: bold ? 1 : 0,
    textStyle: `font-size: ${bold ? 20 : 16}px;`,
  });
  return JSON.stringify({
    root: {
      children: [p(title, true), ...paragraphs.map((text) => p(text))],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  });
}
function note(
  id: string,
  title: string,
  paragraphs: string[],
  theme: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return {
    id: `note-${id}`,
    type: 'custom-note',
    position: { x, y },
    positionAbsolute: { x, y },
    width,
    height,
    selected: false,
    zIndex: 0,
    data: {
      author: 'Duin & Dorp portfolio',
      desc: '',
      title: '',
      type: '',
      selected: false,
      showAuthor: false,
      text: richText(title, paragraphs),
      theme,
      width,
      height,
    },
  };
}
export function annotateCanvas(doc: any, guide: CanvasGuide) {
  const graph = doc.workflow.graph;
  graph.nodes = graph.nodes.filter((n: any) => n.type !== 'custom-note');
  guide.steps.forEach((step, i) => {
    const node = graph.nodes.find((n: any) => n.id === step.id);
    if (!node) throw new Error(`Missing executable node ${guide.id}/${step.id}`);
    node.position = { x: Math.round((i * 1140) / (guide.steps.length - 1)), y: 235 };
    node.positionAbsolute = { ...node.position };
    node.selected = false;
    node.data.desc = step.description;
    node.height = 140;
  });
  const model = guide.steps.find((s) => ['analyse', 'explain', 'extract'].includes(s.id))!;
  graph.nodes.push(
    note(
      'overview',
      `${guide.title} · ${guide.subtitle}`,
      [
        guide.value,
        'Leesrichting: invoer → modelvoorstel → onafhankelijke controle → menselijke beoordeling.',
      ],
      'blue',
      0,
      0,
      900,
      180,
    ),
    note(
      'boundary',
      'Gegevensgrens & verantwoordelijkheid',
      [guide.boundary],
      'violet',
      930,
      0,
      450,
      180,
    ),
    note(
      'input',
      '01 · Invoer & voorbereiding',
      [
        guide.steps[0].description,
        `In: ${guide.steps[0].input}`,
        guide.steps.length === 5 ? guide.steps[1].description : guide.steps[0].check,
      ],
      'yellow',
      0,
      420,
      440,
      245,
    ),
    note(
      'model',
      '02 · Begrensde modeltaak',
      [model.description, `Uit: ${model.output}`, model.check],
      'yellow',
      470,
      420,
      440,
      245,
    ),
    note(
      'guard',
      '03 · Controle & overdracht',
      [
        guide.steps.find((s) => s.id === 'validate')!.description,
        guide.owner,
        guide.steps.at(-1)!.check,
      ],
      'violet',
      940,
      420,
      440,
      245,
    ),
    note(
      'tests',
      'Test het gedrag zelf',
      guide.tests.map((t) => t.canvas ?? `${t.label}: ${t.input}\nVerwacht: ${t.expect}`),
      'blue',
      0,
      705,
      675,
      250,
    ),
    note(
      'operations',
      'Als het misgaat',
      [
        guide.failure,
        'Beheer: sleutels alleen op de server; Web App uit; geen actietools. Wijzig broncode/prompts → dify:sync → tests → importeer → publiceer → live smoke.',
      ],
      'violet',
      705,
      705,
      675,
      250,
    ),
  );
  if (guide.id === 'agent-comparison') {
    for (const node of graph.nodes) {
      if (node.type === 'custom-note' && node.position.y >= 420) {
        node.position.y += 100;
        node.positionAbsolute.y += 100;
      }
    }
  }
  graph.viewport = { x: 75, y: 35, zoom: 0.78 };
  return doc;
}
