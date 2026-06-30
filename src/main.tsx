import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  BadgePercent,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  Gift,
  LineChart,
  MessageCircle,
  PackageCheck,
  Scissors,
  Send,
  Sparkles,
  Star,
  UsersRound,
} from 'lucide-react';
import './styles.css';
import { askPublicBot, config, publicUrl, track } from './runtime';

type Message = { from: 'user' | 'bot'; text: string };

const modules = [
  ['Agenda inteligente', 'Día, semana, mes, profesionales, recursos, sedes, disponibilidad, bloqueos y lista de espera.', CalendarDays],
  ['Clientes', 'Ficha completa con datos, preferencias, historial, observaciones, productos usados y servicios realizados.', UsersRound],
  ['Servicios', 'Catálogo con duración, precio, profesional, recursos necesarios y estado.', Scissors],
  ['Reservas', 'Reserva online, confirmación, reprogramación, cancelación y links públicos.', Clock3],
  ['Expedientes de servicio', 'Fotos antes/después, productos utilizados, garantías, consentimientos, observaciones y seguimiento.', ClipboardList],
  ['Marketing', 'Clientes nuevos, frecuentes, inactivos, no-show, cumpleaños, cupones y campañas.', BadgePercent],
  ['Fidelización', 'Membresías, packs, bonos, beneficios, clientes VIP y recurrencia.', Gift],
  ['Inventario', 'Integración con DiceCommerce para descontar automáticamente productos utilizados.', PackageCheck],
  ['Dashboard', 'Ocupación, ticket promedio, cancelaciones, no-show, facturación, productividad y servicios vendidos.', LineChart],
  ['Copiloto comercial', 'Preguntas sobre huecos, campañas, rentabilidad, clientes inactivos y cancelaciones.', Bot],
] as const;

const industries = ['Peluquerías', 'Barberías', 'Estética', 'Nails', 'Spa', 'Tatuajes', 'Masajes', 'Academias', 'Talleres', 'Servicios técnicos'];

const flows = [
  ['Cliente', 'Toda la operación comercial nace en la ficha del cliente.'],
  ['Reserva', 'Online, por mostrador o por equipo, con disponibilidad por sede y profesional.'],
  ['Confirmación', 'Links públicos, WhatsApp/email, reprogramación y cancelación.'],
  ['Atención', 'Servicio realizado, expediente, productos utilizados y observaciones.'],
  ['Cobro', 'Ticket, productos asociados, próxima visita y recurrencia sugerida.'],
  ['Campaña', 'Segmentos por frecuencia, no-show, cumpleaños, VIP e inactivos.'],
  ['Cliente recurrente', 'Membresías, packs, beneficios y seguimiento comercial.'],
];

const coreCapabilities = ['Usuarios', 'Roles', 'Permisos', 'Multiempresa', 'Agenda', 'Expedientes', 'Documentos', 'Dashboard', 'Automatizaciones', 'Marketing', 'Copiloto IA'];

const demoReservations = [
  ['09:00', 'Corte + barba', 'Sofía Rivas', 'Confirmado'],
  ['10:30', 'Coloración', 'Camila Torres', 'Reconfirmado'],
  ['12:00', 'Spa facial', 'Carla Núñez', 'Pendiente'],
  ['15:30', 'Masaje descontracturante', 'Lucas Pérez', 'Lista de espera'],
];

const publicLinks = [
  {
    title: 'Confirmar turno',
    tag: 'CONFIRMACIÓN',
    copy: 'Vista pública para que el cliente confirme asistencia sin entrar al backoffice.',
    detail: 'Corte + barba · Sofía Rivas · Sede Palermo · 09:00',
    href: publicUrl(config.confirmPath),
  },
  {
    title: 'Reprogramar reserva',
    tag: 'REPROGRAMACIÓN',
    copy: 'Experiencia pública para elegir otro horario disponible y conservar trazabilidad.',
    detail: 'Coloración · Camila Torres · Próximos slots disponibles',
    href: publicUrl(config.reschedulePath),
  },
  {
    title: 'Lista de espera',
    tag: 'WAITLIST',
    copy: 'Link para tomar un hueco liberado, confirmar condiciones y recuperar ocupación.',
    detail: 'Spa facial · Lista de espera · Prioridad por scoring',
    href: publicUrl(config.waitlistPath),
  },
] as const;

const copilotKnowledge = [
  {
    intent: ['agenda', 'turno', 'reserva', 'disponibilidad'],
    answer: 'ServicePub organiza la agenda por sede, profesional, servicio y recurso. Cada turno tiene estado, duración, confirmación, recordatorio, posibilidad de reprogramar y trazabilidad del cambio.',
  },
  {
    intent: ['cliente', 'historial', 'preferencia', 'expediente'],
    answer: 'La ficha del cliente debe mostrar datos de contacto, preferencias, historial de servicios, observaciones, productos usados, fotos antes/después y próximo turno sugerido.',
  },
  {
    intent: ['no show', 'cancelacion', 'inasistencia', 'confirmacion'],
    answer: 'El no-show se reduce con links públicos de confirmación/reconfirmación, recordatorios por WhatsApp/email, scoring de cliente y lista de espera para recuperar huecos.',
  },
  {
    intent: ['marketing', 'campaña', 'cumpleaños', 'fidelizacion', 'vip'],
    answer: 'Las mejores campañas salen del comportamiento: clientes que no vienen hace 45 días, cumpleaños, servicios recurrentes, membresías, packs vencidos y clientes con alto valor.',
  },
  {
    intent: ['roi', 'ocupacion', 'rentabilidad', 'profesional'],
    answer: 'El ROI se mide por mayor ocupación, menos cancelaciones, más recurrencia, mejor ticket promedio, menor carga administrativa y mejor productividad por profesional.',
  },
];

function answer(prompt: string) {
  const normalized = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return copilotKnowledge.find((item) => item.intent.some((key) => normalized.includes(key)))?.answer
    ?? 'Lo llevaría al flujo completo: cliente, servicio, profesional, reserva, confirmación, atención, expediente, cobro, próxima visita y campaña automática.';
}

function Copilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { from: 'bot', text: 'Soy el copiloto de ServicePub. Preguntame por agenda, no-show, clientes, campañas o fidelización.' },
  ]);
  const prompts = ['¿Qué clientes hace 45 días no vienen?', '¿Cómo bajo el no-show?', '¿Qué profesional tiene más demanda?'];
  const send = (text: string) => {
    if (!text.trim()) return;
    track('BOT_QUESTION', { actionCode: 'servicepub_public_copilot_question', actionLabel: text.slice(0, 120), category: 'COPILOT' });
    setMessages((current) => [...current, { from: 'user', text }, { from: 'bot', text: answer(text) }]);
    void askPublicBot(text).then((remoteAnswer) => {
      if (remoteAnswer) {
        setMessages((current) => [...current.slice(0, -1), { from: 'bot', text: remoteAnswer }]);
      }
    });
    setInput('');
    setOpen(true);
  };
  return (
    <>
      <button className="copilot-pill" onClick={() => setOpen((value) => !value)}><Sparkles size={18} /> Copiloto</button>
      {open && (
        <aside className="copilot-panel">
          <header><Bot size={20} /><strong>Copiloto ServicePub</strong><button onClick={() => setOpen(false)}>x</button></header>
          <div className="prompt-row">{prompts.map((prompt) => <button key={prompt} onClick={() => send(prompt)}>{prompt}</button>)}</div>
          <div className="chat-log">{messages.slice(-6).map((message, index) => <p key={index} className={message.from}>{message.text}</p>)}</div>
          <form onSubmit={(event) => { event.preventDefault(); send(input); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Preguntar por agenda..." /><button><Send size={17} /></button></form>
        </aside>
      )}
    </>
  );
}

function App() {
  useEffect(() => {
    track('VIEW', { actionCode: 'servicepub_page_home', actionLabel: 'ServicePub landing', category: 'NAVIGATION' });
  }, []);

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#inicio"><span className="brand-mark" /><span><strong>ServicePub</strong><small>Gestión por turnos</small></span></a>
        <div><a data-mkt="servicepub_nav_modules" href="#modulos">Módulos</a><a data-mkt="servicepub_nav_core" href="#core">Core</a><a data-mkt="servicepub_nav_roi" href="#roi">ROI</a><a data-mkt="servicepub_nav_links" href="#links">Links</a><a data-mkt="servicepub_nav_demo" href="#demo">Demo</a></div>
      </nav>
      <section id="inicio" className="hero">
        <div>
          <p className="eyebrow">SERVICIOS · TURNOS · CLIENTES · FIDELIZACIÓN</p>
          <h1>El BackOffice para empresas de servicios que trabajan por turnos.</h1>
          <p>Administrá clientes, reservas, profesionales, servicios, fidelización y marketing desde una única plataforma.</p>
          <div className="actions"><a className="button primary" href="#demo" onClick={() => track('CLICK', { actionCode: 'servicepub_cta_demo', actionLabel: 'Ver demo', category: 'CTA' })}>Ver demo <ArrowRight size={18} /></a><a className="button secondary" href="#modulos" onClick={() => track('CLICK', { actionCode: 'servicepub_cta_modules', actionLabel: 'Ver módulos', category: 'CTA' })}>Ver módulos</a></div>
        </div>
        <div className="agenda-board">
          <header><CalendarDays /><strong>Agenda de hoy</strong><span>87% ocupación</span></header>
          {demoReservations.map(([time, service, professional, status]) => <article key={time}><b>{time}</b><div><strong>{service}</strong><span>{professional}</span></div><em>{status}</em></article>)}
        </div>
      </section>
      <section className="proof">
        {[
          ['300+', 'turnos demo con estados'],
          ['8', 'profesionales conectados'],
          ['-22%', 'no-show estimado'],
          ['+31%', 'recurrencia accionable'],
        ].map(([value, label]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}
      </section>
      <section id="modulos" className="section">
        <div className="section-title"><p className="eyebrow">GESTIÓN COMPLETA DEL NEGOCIO</p><h2>No es una agenda online.</h2><p>ServicePub administra el flujo completo: cliente, reserva, confirmación, recordatorio, atención, expediente, cobro, próxima visita, campaña y cliente recurrente.</p></div>
        <div className="cards">{modules.map(([title, copy, Icon]) => <article key={title}><Icon /><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>
      <section id="rubros" className="section split">
        <div><p className="eyebrow">MULTIRUBRO</p><h2>Un mismo Core para cualquier negocio basado en turnos.</h2><p>El sistema cambia el vocabulario y los flujos por rubro, pero conserva agenda, clientes, servicios, profesionales, reservas, marketing y datos.</p></div>
        <div className="industry-list">{industries.map((item) => <span key={item}><CheckCircle2 size={16} /> {item}</span>)}</div>
      </section>
      <section id="core" className="section core-panel">
        <div className="section-title"><p className="eyebrow">CONSTRUIDO SOBRE DICEPROJECTS CORE</p><h2>La operación comercial comparte seguridad, datos, automatización e inteligencia.</h2><p>ServicePub toma el Core de DiceProjects y lo adapta al negocio de servicios, reservas, clientes, campañas y rentabilidad.</p></div>
        <div className="core-list">{coreCapabilities.map((item) => <span key={item}><CheckCircle2 size={16} /> {item}</span>)}</div>
      </section>
      <section className="section flows">
        <div className="section-title"><p className="eyebrow">FLUJOS PRINCIPALES</p><h2>De la reserva a la recurrencia.</h2></div>
        <div>{flows.map(([title, copy], index) => <article key={title}><b>{index + 1}</b><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>
      <section id="roi" className="section roi">
        <div><p className="eyebrow">ROI</p><h2>Más ocupación, menos huecos y clientes que vuelven.</h2><p>La plataforma mejora el negocio reduciendo cancelaciones, activando campañas, ordenando profesionales y automatizando recordatorios.</p></div>
        <div className="metrics">
          <article><LineChart /><strong>87%</strong><span>ocupación de agenda</span></article>
          <article><BadgePercent /><strong>$42k</strong><span>ticket promedio demo</span></article>
          <article><Star /><strong>38</strong><span>clientes VIP activos</span></article>
          <article><MessageCircle /><strong>-19%</strong><span>no-show con confirmaciones</span></article>
        </div>
      </section>
      <section className="section kb-strip">
        <article>
          <p className="eyebrow">KB PARA COPILOTO</p>
          <h2>Experto en agendas y gestión de servicios.</h2>
          <p>La base del copiloto entiende agenda, turnos, servicios, profesionales, clientes, no-show, campañas, fidelización e inventario asociado.</p>
        </article>
        <div className="kb-list">
          <span><CalendarDays size={18} /> Disponibilidad por sede, profesional y recurso.</span>
          <span><UsersRound size={18} /> Clientes, historial, preferencias y expediente.</span>
          <span><Clock3 size={18} /> Confirmaciones, reprogramaciones y no-show.</span>
          <span><Gift size={18} /> Membresías, campañas, packs y segmentos VIP.</span>
        </div>
      </section>
      <section id="links" className="section public-links">
        <div className="section-title">
          <p className="eyebrow">LINKS PÚBLICOS DEMO</p>
          <h2>Cómo se ve la experiencia fuera del backoffice.</h2>
          <p>Estos accesos muestran el tipo de pantalla que recibe un cliente por WhatsApp o email para confirmar, reprogramar o tomar un turno liberado.</p>
        </div>
        <div className="link-grid">
          {publicLinks.map((item) => (
            <a className="public-card" href={item.href} target="_blank" rel="noreferrer" key={item.title} onClick={() => track('APPOINTMENT_VIEW', { actionCode: `servicepub_public_link_${item.tag.toLowerCase()}`, actionLabel: item.title, category: 'PUBLIC_LINK', entityType: 'APPOINTMENT', metadata: { href: item.href, detail: item.detail } })}>
              <span className="link-top"><small>{item.tag}</small><ExternalLink size={18} /></span>
              <strong>{item.title}</strong>
              <p>{item.copy}</p>
              <em>{item.detail}</em>
            </a>
          ))}
        </div>
      </section>
      <section id="demo" className="section lead">
        <div><p className="eyebrow">DATOS DEMO</p><h2>Un negocio funcionando, nunca una pantalla vacía.</h2><p>Profesionales Sofía, Martín, Carla y Lucas; servicios de corte, color, barba, spa y masaje; clientes nuevos, frecuentes, VIP e inactivos; agenda ocupada, próximas reservas, facturación, membresías y campañas.</p></div>
        <div className="demo-panel">
          <h3>Próximas reservas</h3>
          {demoReservations.map(([time, service, professional, status]) => <p key={time}><b>{time}</b><span>{service} · {professional}</span><em>{status}</em></p>)}
        </div>
        <form><input placeholder="Nombre" /><input placeholder="Email" /><textarea placeholder="Contanos tu rubro y cantidad de profesionales/sedes" /><button className="button primary" type="button">Solicitar demo</button></form>
      </section>
      <footer>ServicePub no es una agenda online. Es el BackOffice para hacer crecer negocios basados en turnos.</footer>
      <Copilot />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
