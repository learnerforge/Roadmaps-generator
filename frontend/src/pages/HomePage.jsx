import { Link } from 'react-router-dom'

const FEATURES = [
  { title: 'AI-Powered Explanations', desc: 'Every topic explained in simple language with real-world analogies and code examples.' },
  { title: 'Interactive Roadmaps', desc: 'Clickable skill nodes with progress tracking. See exactly where you are.' },
  { title: 'Personalized Learning', desc: 'AI generates weekly plans based on your pace, level, and available time.' },
  { title: 'Quizzes & Projects', desc: 'Test your knowledge with AI-generated quizzes and build real projects.' },
  { title: 'Progress Dashboard', desc: 'Track completion across all roadmaps with streaks and stats.' },
  { title: 'Admin CMS', desc: 'Full content management for roadmaps, nodes, and resources.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="section-spotlight relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-glow via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,106,247,0.08),transparent_60%)] pointer-events-none" />
        <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:py-32 relative">
          <div className="badge badge-accent mb-6 mx-auto w-fit text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            AI Career Roadmaps
          </div>
          <h1 className="text-display mb-6 text-white">
            Navigate your tech career
            <br />
            with <span className="text-gradient">AI-powered clarity</span>
          </h1>
          <p className="mb-10 text-lg text-text-2 max-w-2xl mx-auto leading-relaxed">
            Personalized learning roadmaps for developers. AI explains every concept,
            generates quizzes, suggests projects, and tracks your progress &mdash; step by step.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/roadmaps"
              className="btn-primary !px-8 !py-3 text-sm"
            >
              Explore Roadmaps
            </Link>
            <Link
              to="/register"
              className="btn-ghost !px-8 !py-3 text-sm"
            >
              Start Free
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section-spotlight mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-display-sm mb-12 text-center">
          Why PathForge is <span className="text-gradient">different</span>
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card-elevated p-6"
            >
              <h3 className="mb-2 text-sm font-semibold text-text">{f.title}</h3>
              <p className="text-sm text-text-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-border bg-bg-2 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,106,247,0.06),transparent_60%)] pointer-events-none" />
        <div className="section-spotlight mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="text-display-sm mb-4">
            Ready to start <span className="text-gradient">learning?</span>
          </h2>
          <p className="mb-8 text-text-2 text-base">
            Choose a roadmap, set your pace, and let AI guide you step by step.
          </p>
          <Link
            to="/roadmaps"
            className="btn-primary !px-10 !py-3"
          >
            Browse All Roadmaps
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-xs text-text-3">
            PathForge AI — Built for developers, by developers. MIT License.
          </p>
        </div>
      </footer>
    </div>
  )
}
