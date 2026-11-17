'use client'

import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Building2, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/utils/cn'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

const signupSchema = loginSchema.extend({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  organization_name: z.string().min(2, 'Nome da organização é obrigatório'),
  cnpj: z.string().optional(),
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: 'Senhas não coincidem',
  path: ['confirm_password'],
})

type LoginForm = z.infer<typeof loginSchema>
type SignupForm = z.infer<typeof signupSchema>

export function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirm_password: '', full_name: '', organization_name: '', cnpj: '' },
  })

  const handleLogin = async (data: LoginForm) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) throw error
      toast.addToast({ type: 'success', title: 'Bem-vindo!' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro ao entrar', message: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (data: SignupForm) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            organization_name: data.organization_name,
            cnpj: data.cnpj,
          },
        },
      })
      if (error) throw error
      toast.addToast({ 
        type: 'success', 
        title: 'Conta criada!', 
        message: 'Verifique seu e-mail para confirmar a conta.' 
      })
      setIsSignup(false)
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro ao criar conta', message: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    const email = loginForm.getValues('email')
    if (!email) {
      toast.addToast({ type: 'warning', title: 'Digite seu e-mail primeiro' })
      return
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      toast.addToast({ type: 'success', title: 'E-mail de recuperação enviado' })
    } catch (error: any) {
      toast.addToast({ type: 'error', title: 'Erro', message: error.message })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{isSignup ? 'Criar Conta' : 'Entrar no Estoque'}</CardTitle>
          <CardDescription>
            {isSignup 
              ? 'Preencha os dados para criar sua organização' 
              : 'Acesse sua conta para gerenciar o estoque'}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={isSignup ? signupForm.handleSubmit(handleSignup) : loginForm.handleSubmit(handleLogin)} className="space-y-4">
          {isSignup && (
            <div className="space-y-4">
              <Input
                label="Nome Completo"
                {...signupForm.register('full_name')}
                error={signupForm.formState.errors.full_name?.message}
                required
              />
              <Input
                label="Nome da Organização"
                {...signupForm.register('organization_name')}
                error={signupForm.formState.errors.organization_name?.message}
                required
              />
              <Input
                label="CNPJ (opcional)"
                {...signupForm.register('cnpj')}
                placeholder="00.000.000/0000-00"
              />
            </div>
          )}

          <Input
            label="E-mail"
            type="email"
            {...(isSignup ? signupForm.register('email') : loginForm.register('email'))}
            error={(isSignup ? signupForm.formState.errors.email : loginForm.formState.errors.email)?.message}
            required
          />

          <div className="relative">
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              {...(isSignup ? signupForm.register('password') : loginForm.register('password'))}
              error={(isSignup ? signupForm.formState.errors.password : loginForm.formState.errors.password)?.message}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {isSignup && (
            <Input
              label="Confirmar Senha"
              type={showPassword ? 'text' : 'password'}
              {...signupForm.register('confirm_password')}
              error={signupForm.formState.errors.confirm_password?.message}
              required
            />
          )}

          {!isSignup && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-input" />
                <span className="text-sm">Lembrar-me</span>
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={handleForgotPassword}>
                Esqueci a senha
              </Button>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading} size="lg">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {isSignup ? 'Criar Conta' : 'Entrar'}
          </Button>
        </form>

        <CardFooter className="flex flex-col gap-4">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? 'Já tem conta? Entrar' : 'Não tem conta? Criar uma'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}