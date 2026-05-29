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
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-glow via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:py-32 relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-glow px-4 py-1.5 text-xs font-mono text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            AI Career Roadmaps
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            Navigate your tech career
            <br />
            with <span className="text-accent">AI-powered clarity</span>
          </h1>
          <p className="mb-10 text-lg text-text-2 max-w-2xl mx-auto">
            Personalized learning roadmaps for developers. AI explains every concept,
            generates quizzes, suggests projects, and tracks your progress — step by step.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/roadmaps"
              className="rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-2 transition-all shadow-lg shadow-accent/20"
            >
              Explore Roadmaps
            </Link>
            <Link
              to="/register"
              className="rounded-xl border border-border px-8 py-3 text-sm font-medium text-text-2 hover:border-accent hover:text-accent transition-all"
            >
              Start Free
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="mb-12 text-center text-2xl font-bold text-white">
          Why PathForge is different
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-bg-2 p-6 hover:border-accent/50 transition-colors"
            >
              <h3 className="mb-2 text-sm font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-text-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-bg-2">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Ready to start learning?
          </h2>
          <p className="mb-8 text-text-2">
            Choose a roadmap, set your pace, and let AI guide you step by step.
          </p>
          <Link
            to="/roadmaps"
            className="inline-flex rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-2 transition-all shadow-lg shadow-accent/20"
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
