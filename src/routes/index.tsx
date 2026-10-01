import { createFileRoute } from '@tanstack/react-router';
import NexusApp from '../components/nexus-app';
export const Route=createFileRoute('/')({head:()=>({meta:[{title:'NEXUS — Visão geral'},{name:'description',content:'Acompanhe demandas, chamados e a continuidade do contexto no NEXUS.'},{property:'og:title',content:'NEXUS — Visão geral'},{property:'og:description',content:'Acompanhe demandas, chamados e a continuidade do contexto no NEXUS.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:()=> <NexusApp view="dashboard"/>});
