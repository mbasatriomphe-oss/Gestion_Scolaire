import Image from 'next/image'
import { LoginForm } from '@/components/auth/login-form'
import { Logo } from '@/components/app/logo'

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Image src="/images/campus.png" alt="" fill priority className="object-cover opacity-45" sizes="50vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/70 to-sidebar/30" />
        <Logo className="relative text-white" />
        <div className="relative flex max-w-lg flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">Excellence administrative</p>
          <h2 className="font-serif text-5xl leading-tight font-semibold text-balance text-white">
            Pilotez votre établissement avec sérénité.
          </h2>
          <p className="text-base leading-relaxed text-white/70 text-pretty">
            Élèves, enseignants, notes, bulletins, frais et rapports réunis dans une seule plateforme élégante, pensée pour toute l&apos;équipe éducative.
          </p>
          <dl className="grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {[
              ['180+', 'Élèves suivis'],
              ['14', 'Enseignants'],
              ['98%', 'Satisfaction'],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="text-xs text-white/60">{label}</dt>
                <dd className="font-serif text-2xl font-semibold text-gold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Logo className="mb-10 text-foreground lg:hidden" />
          <LoginForm />
        </div>
      </section>
    </main>
  )
}
