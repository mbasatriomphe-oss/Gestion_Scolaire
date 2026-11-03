'use client'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/app/page-header'
import { SimpleSelect } from '@/components/app/simple-select'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/api'
import { loadStudentDirectory, type StudentDirectory } from '@/lib/students-api'
import { loadStudentBulletin, type StudentBulletin } from '@/lib/bulletin-api'
export function StudentGrades(){
 const [directory,setDirectory]=useState<StudentDirectory|null>(null),[classId,setClassId]=useState(''),[studentId,setStudentId]=useState(''),[courseId,setCourseId]=useState('all'),[report,setReport]=useState<StudentBulletin|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{let active=true;setError('');loadStudentDirectory().then(d=>{if(active)setDirectory(d)}).catch(e=>{if(active)setError(getApiErrorMessage(e))});return()=>{active=false}},[retry])
 useEffect(()=>{let active=true;setReport(null);setError('');if(classId && studentId)loadStudentBulletin(Number(studentId),Number(classId)).then(d=>{if(active)setReport(d)}).catch(e=>{if(active)setError(getApiErrorMessage(e))});return()=>{active=false}},[classId,studentId,retry])
 const enrolled=new Set(directory?.enrollments.filter(e=>String(e.id_classe)===classId && e.statut==='actif').map(e=>e.id_eleve))
 return <><PageHeader title="Consultation des cotes" description="Consultez toutes les cotes d’un élève ou filtrez un cours. Seul l’enseignant affecté peut saisir les cotes." />
 <section className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3"><div><label>Classe et année</label><SimpleSelect ariaLabel="Classe et année" value={classId} onValueChange={v=>{setClassId(v);setStudentId('');setCourseId('all')}} options={(directory?.classes ?? []).map(c=>({value:String(c.id_classe),label:c.libelle+' · '+(directory?.years.find(y=>y.id_annee===c.id_annee)?.libelle ?? '')}))} /></div><div><label>Élève</label><SimpleSelect ariaLabel="Élève" value={studentId} onValueChange={v=>{setStudentId(v);setCourseId('all')}} options={(directory?.students ?? []).filter(s=>enrolled.has(s.id_eleve)).map(s=>({value:String(s.id_eleve),label:s.matricule+' · '+s.nom+' '+s.prenom}))} /></div><div><label>Cours</label><SimpleSelect ariaLabel="Cours" value={courseId} onValueChange={setCourseId} options={[{value:'all',label:'Tous les cours'},...(report?.cours ?? []).map(c=>({value:String(c.cours.id_cours),label:c.cours.intitule}))]} /></div></section>
 {error && <p role="alert">{error} <Button onClick={()=>setRetry(v=>v+1)}>Réessayer</Button></p>}
 {report && <><p>Résultat annuel : {report.pourcentage===null?'Incomplet':report.pourcentage.toFixed(2)+' %'} · {report.reussi===null?'Décision en attente':report.reussi?'Réussite':'Échec'}</p><div className="overflow-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead><tr><th className="p-3 text-left">Cours</th>{report.semestres.map(s=><th key={s.id_semestre} colSpan={3} className="p-3">{s.libelle} · P1 / P2 / Examen</th>)}<th>Moyenne / 20</th></tr></thead><tbody>{report.cours.filter(c=>courseId==='all'||String(c.cours.id_cours)===courseId).map(c=><tr key={c.id_affectation} className="border-t"><td className="p-3 font-medium">{c.cours.intitule}</td>{c.semestres.flatMap(s=>s.periodes.map(p=><td key={p.id_periode} className="p-3 text-center">{p.valeur===null?'—':p.valeur+' / '+p.maximum}</td>))}<td className="p-3 text-center">{c.moyenne_annuelle?.toFixed(2) ?? '—'}</td></tr>)}</tbody></table></div></>}
 </>
}
