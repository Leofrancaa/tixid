import Link from "next/link";

export const metadata = {
  title: "Como jogar — Vonix",
};

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <div className="animate-fade-up mb-10 text-center">
        <Link
          href="/"
          className="mb-6 inline-block font-label text-xs uppercase tracking-widest text-parchment/30 transition hover:text-parchment/60"
        >
          ← Voltar
        </Link>
        <h1
          className="mb-2 text-dixit-gold"
          style={{
            fontFamily: "var(--font-vonix), var(--font-cinzel), serif",
            fontSize: "clamp(2.5rem, 8vw, 4rem)",
            letterSpacing: "0.12em",
            textShadow: "0 0 40px rgba(201,168,76,0.3)",
          }}
        >
          Como Jogar
        </h1>
        <div className="ornament mx-auto mt-3 max-w-xs text-xs">regras do vonix</div>
      </div>

      <article className="space-y-8 font-serif text-parchment/80">

        <Section title="O que é o Vonix">
          <p>
            Vonix é um jogo de histórias e imaginação para <b>3 a 12 jogadores</b>,
            inspirado no clássico Dixit. A cada rodada um jogador vira o <em>storyteller</em> e
            conta uma breve pista sobre uma carta secreta. Os outros tentam enganar os
            colegas escolhendo cartas que combinem com a pista, e então todos votam para
            descobrir qual era a carta original.
          </p>
        </Section>

        <Section title="Fluxo da rodada">
          <ol className="list-decimal space-y-3 pl-5 marker:text-dixit-gold/60">
            <li>
              <b className="text-parchment">Dica do storyteller.</b> O storyteller escolhe
              uma carta da sua mão e escreve uma dica — pode ser uma palavra, frase,
              emoção, som, música ou qualquer pista que evoque a carta.
            </li>
            <li>
              <b className="text-parchment">Submissão.</b> Os demais jogadores escolhem,
              em segredo, uma carta da própria mão que combine com a dica.
            </li>
            <li>
              <b className="text-parchment">Votação.</b> As cartas são embaralhadas e
              reveladas sem autor. Cada jogador (exceto o storyteller) vota na carta que
              acredita ser a original.
            </li>
            <li>
              <b className="text-parchment">Revelação e pontos.</b> A carta do storyteller
              é revelada, os votos contabilizados e os pontos distribuídos.
            </li>
          </ol>
        </Section>

        <Section title="Pontuação — modo clássico (3 a 6 jogadores)">
          <ul className="space-y-2.5">
            <Rule
              title="Todos acertam"
              desc="Se todos os votos forem na carta do storyteller, o storyteller não pontua e os demais ganham 2 pontos cada."
            />
            <Rule
              title="Ninguém acerta"
              desc="Se ninguém votar na carta do storyteller, o storyteller não pontua e os demais ganham 2 pontos cada."
            />
            <Rule
              title="Alguns acertam"
              desc="Se pelo menos um jogador — mas não todos — acertar, o storyteller e os acertadores ganham 3 pontos."
            />
            <Rule
              title="Bônus por enganar"
              desc="Cada jogador (não-storyteller) ganha 1 ponto extra para cada voto recebido na própria carta."
            />
          </ul>
        </Section>

        <Section title="Modo Odyssey (7 a 12 jogadores)">
          <p className="mb-3">
            Com 7 ou mais jogadores, cada não-storyteller pode registrar até{" "}
            <b>2 votos por rodada</b>: um voto principal e um voto secundário opcional.
          </p>
          <ul className="space-y-2.5">
            <Rule
              title="Voto principal"
              desc="Vale a pontuação normal do modo clássico."
            />
            <Rule
              title="Voto secundário"
              desc="Se cair na carta do storyteller, rende +1 ponto. Não precisa ser usado — é puramente opcional."
            />
            <Rule
              title="Limite por rodada"
              desc="Um jogador ganha no máximo 5 pontos por rodada, somando todas as fontes."
            />
            <Rule
              title="Revelação pelo host"
              desc="No Odyssey, o host aciona manualmente a revelação depois que todos os votos principais entrarem, dando tempo para os votos secundários."
            />
          </ul>
        </Section>

        <Section title="Fim de jogo">
          <p>
            A partida termina quando algum jogador atinge a pontuação-alvo da sala
            (padrão <b>30 pontos</b>). O jogador com mais pontos vence. Em caso de
            empate, todos os empatados compartilham a vitória.
          </p>
        </Section>

        <div className="pt-4 text-center">
          <Link href="/" className="btn-gold inline-block px-8 py-3 text-sm">
            Jogar agora
          </Link>
        </div>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel animate-fade-up p-6">
      <h2
        className="mb-3 font-display text-xl text-dixit-gold"
        style={{ letterSpacing: "0.08em" }}
      >
        {title}
      </h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Rule({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="flex gap-3 rounded border border-dixit-gold/10 bg-dixit-gold/[0.03] px-3 py-2.5">
      <span className="mt-0.5 text-dixit-gold/60">◆</span>
      <div>
        <b className="text-parchment">{title}.</b>{" "}
        <span className="text-parchment/65">{desc}</span>
      </div>
    </li>
  );
}
