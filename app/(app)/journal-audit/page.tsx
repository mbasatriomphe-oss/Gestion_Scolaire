'use client'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage, request } from '@/lib/api'
interface Entry {id_audit:number;action:string;table_cible:string;id_cible:number;date_action:string;details:string;utilisateur:{nom_complet:string;login:string}|null}
export default function AuditPage(){
 const [page,setPage]=useState(1),[last,setLast]=useState(1),[rows,setRows]=useState<Entry[]>([]),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{let active=true;setError('');request<{data:Entry[];last_page:number}>('/journal-audit?page='+page).then(data=>{if(active){setRows(data.data);setLast(data.last_page)}}).catch(e=>{if(active)setError(getApiErrorMessage(e))});return()=>{active=false}},[page,retry])
 return <><PageHeader title="Journal des opérations" description="Auteur, date, opération et valeurs avant/après. Les mots de passe sont exclus du journal." />{error && <p role="alert">{error} <Button onClick={()=>setRetry(v=>v+1)}>Réessayer</Button></p>}<div className="space-y-3">{rows.map(row=><article key={row.id_audit} className="rounded-xl border bg-card p-4"><p className="font-semibold">{row.utilisateur?.nom_complet ?? 'Système / compte supprimé'} · {row.action} · {row.table_cible} #{row.id_cible}</p><p className="text-sm text-muted-foreground">{new Date(row.date_action).toLocaleString('fr')}</p><details className="mt-2 text-sm"><summary>Détails de l’opération</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(JSON.parse(row.details || '{}'),null,2)}</pre></details></article>)}</div><div className="flex items-center gap-3"><Button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Précédent</Button><span>{page} / {last}</span><Button disabled={page>=last} onClick={()=>setPage(p=>p+1)}>Suivant</Button></div></>
}
