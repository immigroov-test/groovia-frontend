import { UI_CONTENT } from '../lib/content';
import { Card, CardBody } from './ui/Card';

// Body of the About page. Kept separate from the route file so it can be reused in
// the /preview gallery without pulling the route's `metadata` export into the client graph.
export function AboutContent() {
  const a = UI_CONTENT.about;
  const total = a.whatWeDo.length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
      {/* What we do */}
      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-brand-900">{a.whatWeDoTitle}</h1>
      <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed">
        {a.whatWeDo.map((p, i) => (
          <p key={i} className={i >= total - 2 ? 'text-brand-900 font-medium text-lg' : 'text-muted'}>
            {p}
          </p>
        ))}
      </div>

      {/* Why choose */}
      <div className="mt-16">
        <p className="text-sm font-medium text-accent-600">{a.whyChooseKicker}</p>
        <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-brand-900 max-w-2xl">
          {a.whyChooseHeadline}
        </h2>
        <p className="mt-4 text-base text-muted leading-relaxed max-w-2xl">{a.whyChooseIntro}</p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 reveal-children">
          {UI_CONTENT.whyJoin.map((w) => (
            <Card key={w.title}>
              <CardBody className="pt-6">
                <h3 className="text-lg font-semibold text-brand-900">{w.title}</h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{w.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
