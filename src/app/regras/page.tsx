import Link from "next/link";

export const metadata = {
  title: "Como jogar - Vonix",
};

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <div className="animate-fade-up mb-10 text-center">
        <Link
          href="/"
          className="mb-6 inline-block font-label text-xs uppercase tracking-widest text-parchment/30 transition hover:text-parchment/60"
        >
          {"<"} Voltar
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
        <Section title="Visao geral">
          <p>
            Vonix tem tres modos: <b>Cartas</b>, <b>Perguntas</b> e <b>Stella</b>.
            Em todos eles, um jogador vira o <em>storyteller</em> da rodada. O
            storyteller muda a cada rodada seguindo a ordem dos assentos.
          </p>
        </Section>

        <Section title="Modo Cartas">
          <ol className="list-decimal space-y-3 pl-5 marker:text-dixit-gold/60">
            <li>
              <b className="text-parchment">Dica do storyteller.</b> O storyteller
              escolhe uma carta da propria mao e escreve uma dica curta.
            </li>
            <li>
              <b className="text-parchment">Cartas dos jogadores.</b> Os outros
              jogadores escolhem, em segredo, uma carta que combine com a dica.
            </li>
            <li>
              <b className="text-parchment">Votacao.</b> As cartas sao reveladas
              embaralhadas. Quem nao e storyteller vota na carta que acha ser a
              original.
            </li>
            <li>
              <b className="text-parchment">Revelacao.</b> A carta do storyteller
              aparece, os votos sao contados e a pontuacao da rodada e aplicada.
            </li>
          </ol>
        </Section>

        <Section title="Modo Perguntas">
          <ol className="list-decimal space-y-3 pl-5 marker:text-dixit-gold/60">
            <li>
              <b className="text-parchment">Pergunta e resposta.</b> O storyteller
              escolhe uma pergunta da mao e digita a resposta. A resposta vira a
              pista publica da rodada.
            </li>
            <li>
              <b className="text-parchment">Perguntas falsas.</b> Os outros jogadores
              escolhem uma pergunta que tambem poderia gerar aquela resposta.
            </li>
            <li>
              <b className="text-parchment">Votacao.</b> Todos tentam descobrir qual
              pergunta era a do storyteller.
            </li>
            <li>
              <b className="text-parchment">Pontuacao.</b> A pontuacao segue a mesma
              logica do modo Cartas: dica boa e aquela que alguns acertam, mas nao
              todo mundo.
            </li>
          </ol>
        </Section>

        <Section title="Modo Stella">
          <ul className="space-y-2.5">
            <Rule
              title="Tema"
              desc="O storyteller escolhe o tema da rodada. Diferente do Stella original, aqui o tema nao vem aleatorio: quem decide e o storyteller."
            />
            <Rule
              title="Grade publica"
              desc="A rodada usa 15 cartas abertas em uma grade. Ninguem usa mao individual no Stella."
            />
            <Rule
              title="Escolha secreta"
              desc="Cada jogador, incluindo o storyteller, marca em segredo de 1 a 10 cartas que combinam com o tema."
            />
            <Rule
              title="No escuro"
              desc="Depois que todos enviam, o jogo mostra quantas cartas cada pessoa marcou. Se alguem marcou mais cartas que todos os outros, esse jogador fica no escuro."
            />
            <Rule
              title="Scout"
              desc="O storyteller comeca como scout. O scout revela uma carta que ele marcou; depois a vez passa pela ordem dos assentos."
            />
            <Rule
              title="Fall"
              desc="Se ninguem mais marcou a carta revelada, o scout cai e para de ganhar estrelas na rodada."
            />
            <Rule
              title="Spark"
              desc="Se duas ou mais pessoas tambem marcaram a carta, todos que marcaram e ainda nao cairam ganham 2 estrelas."
            />
            <Rule
              title="Super-Spark"
              desc="Se exatamente uma pessoa tambem marcou a carta, os dois jogadores que combinaram e ainda nao cairam ganham 3 estrelas."
            />
            <Rule
              title="Fim do Stella"
              desc="Stella dura 4 rodadas. Depois da quarta rodada, vence quem tiver mais pontos."
            />
          </ul>
        </Section>

        <Section title="Pontuacao Cartas e Perguntas">
          <ul className="space-y-2.5">
            <Rule
              title="Todos acertam"
              desc="Se todos votam na carta ou pergunta do storyteller, o storyteller nao pontua e os demais ganham 2 pontos."
            />
            <Rule
              title="Ninguem acerta"
              desc="Se ninguem acerta, o storyteller nao pontua e os demais ganham 2 pontos."
            />
            <Rule
              title="Alguns acertam"
              desc="Se pelo menos um jogador acerta, mas nao todos, o storyteller e os acertadores ganham 3 pontos."
            />
            <Rule
              title="Bonus"
              desc="Cada jogador ganha 1 ponto extra para cada voto recebido na propria carta ou pergunta."
            />
          </ul>
        </Section>

        <Section title="Odyssey">
          <p className="mb-3">
            Com 7 a 12 jogadores no modo Cartas, o jogo permite um voto secundario
            opcional.
          </p>
          <ul className="space-y-2.5">
            <Rule
              title="Voto principal"
              desc="Conta como o voto normal da rodada."
            />
            <Rule
              title="Voto secundario"
              desc="Se tambem cair na carta do storyteller, rende 1 ponto extra."
            />
            <Rule
              title="Limite"
              desc="No Odyssey, um jogador pode ganhar no maximo 5 pontos em uma rodada."
            />
          </ul>
        </Section>

        <Section title="Fim de jogo">
          <p>
            Cartas e Perguntas acabam quando alguem chega na pontuacao-alvo da sala
            (por padrao, 30 pontos). Stella ignora essa meta e acaba depois de 4
            rodadas. Em caso de empate, os jogadores empatados compartilham a vitoria.
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
      <span className="mt-0.5 text-dixit-gold/60">-</span>
      <div>
        <b className="text-parchment">{title}.</b>{" "}
        <span className="text-parchment/65">{desc}</span>
      </div>
    </li>
  );
}
