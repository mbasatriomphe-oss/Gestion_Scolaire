'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app/page-header'
import { EntityFormDialog } from '@/components/app/entity-form-dialog'
import { Button } from '@/components/ui/button'
import { clearAuthToken, request, toAppUser, type ApiUser } from '@/lib/api'
import { db, useCurrentUser } from '@/lib/store'
export default function ProfilePage() {
 const user = useCurrentUser(); const router = useRouter()
 const [profile,setProfile] = useState(false); const [password,setPassword] = useState(false)
 return <><PageHeader title="Mon profil" description="Modifiez vos informations personnelles et votre mot de passe." />
 <section className="space-y-4 rounded-xl border bg-card p-6"><p className="font-semibold">{user?.name}</p><p>{user?.email}</p><div className="flex gap-3"><Button onClick={()=>setProfile(true)}>Modifier mon profil</Button><Button variant="outline" onClick={()=>setPassword(true)}>Changer mon mot de passe</Button></div></section>
 <EntityFormDialog open={profile} onOpenChange={setProfile} title="Modifier mon profil" initial={{nom_complet:user?.name ?? '',email:user?.email.includes('@') ? user.email : ''}} fields={[{name:'nom_complet',label:'Nom complet',required:true},{name:'email',label:'E-mail',type:'email'}]} onSubmit={async values=>{const saved=await request<ApiUser>('/auth/profile',{method:'PUT',body:JSON.stringify({...values,email:values.email || null})});db.loginWithUser(toAppUser(saved));toast.success('Profil mis à jour.')}} />
 <EntityFormDialog open={password} onOpenChange={setPassword} title="Changer mon mot de passe" initial={{mot_de_passe_actuel:'',nouveau_mot_de_passe:'',nouveau_mot_de_passe_confirmation:''}} fields={[{name:'mot_de_passe_actuel',label:'Mot de passe actuel',type:'password',required:true},{name:'nouveau_mot_de_passe',label:'Nouveau mot de passe',type:'password',required:true,validate:v=>v.length<8?'Au moins 8 caractères.':undefined},{name:'nouveau_mot_de_passe_confirmation',label:'Confirmation',type:'password',required:true,validate:(v,values)=>v!==values.nouveau_mot_de_passe?'Les mots de passe ne correspondent pas.':undefined}]} onSubmit={async values=>{await request('/auth/change-password',{method:'PUT',body:JSON.stringify(values)});clearAuthToken();db.logout();router.replace('/');toast.success('Mot de passe modifié. Reconnectez-vous.')}} />
 </>
}
