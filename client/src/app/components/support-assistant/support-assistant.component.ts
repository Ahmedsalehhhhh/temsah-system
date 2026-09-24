import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, ElementRef, ViewChild, effect, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { AuthService } from '../../core/auth.service'
import { PayrollService } from '../../core/payroll.service'
import { prepareImage } from '../../core/image-upload'

type ChatRole = 'user' | 'assistant'
type ChatMessage = {
  role: ChatRole
  content: string
  sources?: string[]
  mode?: 'ai' | 'knowledge'
  notice?: string
  escalated?: boolean
  supportCase?: boolean
}

@Component({
  selector: 'app-support-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './support-assistant.component.html',
  styleUrl: './support-assistant.component.css',
})
export class SupportAssistantComponent {
  @ViewChild('messageInput') messageInput?: ElementRef<HTMLTextAreaElement>
  readonly api = environment.apiUrl + '/support-assistant'
  readonly open = signal(false)
  readonly busy = signal(false)
  readonly aiEnabled = signal(false)
  readonly messages = signal<ChatMessage[]>([])
  draft = ''
  error = ''
  imageData = ''
  imageName = ''
  readonly suggestions = [
    'عندي مشكلة في الـLIVE',
    'ساعدني أفهم إشعار TikTok',
    'عايز رأيك في موضوع',
    'اشرحلي حاجة ببساطة',
  ]

  constructor(public auth: AuthService, private payroll: PayrollService, private http: HttpClient) {
    effect(() => {
      const userId = this.auth.user()?.id
      if (!userId) return
      try {
        const saved = JSON.parse(localStorage.getItem(this.storageKey()) || '[]')
        if (Array.isArray(saved)) this.messages.set(saved.slice(-30))
      } catch { this.messages.set([]) }
    }, { allowSignalWrites: true })
  }

  async toggle() {
    this.open.update(value => !value)
    if (!this.open()) return
    setTimeout(() => this.messageInput?.nativeElement.focus(), 50)
    if (!this.messages().length) {
      this.messages.set([{ role: 'assistant', content: 'أهلًا 👋 كلّمني براحتك في أي سؤال أو موضوع. ولو عندك مشكلة تخص TikTok أو شغل الوكالة، هساعدك فيها خطوة بخطوة.' }])
      this.persist()
    }
    try {
      const status = await firstValueFrom(this.http.get<any>(this.api + '/status'))
      this.aiEnabled.set(Boolean(status.aiEnabled))
    } catch { this.aiEnabled.set(false) }
  }

  useSuggestion(value: string) {
    this.draft = value
    setTimeout(() => {
      const input = this.messageInput?.nativeElement
      if (!input) return
      this.resizeTextarea(input)
      input.focus()
    })
  }

  async chooseImage(event: Event) {
    this.error = ''
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    input.value = ''
    try {
      const prepared = await prepareImage(file)
      this.imageName = prepared.name
      this.imageData = prepared.dataUrl
    } catch (error: any) { this.error = error?.message || 'تعذر تجهيز الصورة' }
  }

  removeImage() { this.imageData = ''; this.imageName = '' }

  async send() {
    const content = this.draft.trim()
    if ((!content && !this.imageData) || this.busy()) return
    this.error = ''
    const history = this.messages().filter(item => item.content).slice(-8).map(item => ({ role: item.role, content: item.content }))
    const shownContent = content || 'حلّل صورة إشعار TikTok المرفقة.'
    this.messages.update(rows => [...rows, { role: 'user', content: shownContent }])
    const image = this.imageData
    this.draft = ''
    setTimeout(() => {
      const input = this.messageInput?.nativeElement
      if (input) this.resizeTextarea(input)
    })
    this.removeImage()
    this.busy.set(true)
    this.persist()
    this.scrollToBottom()
    try {
      const result = await firstValueFrom(this.http.post<any>(this.api + '/chat', { message: content, image, history }))
      this.messages.update(rows => [...rows, {
        role: 'assistant', content: result.answer, sources: result.sources || [], mode: result.mode,
        notice: result.notice, supportCase: Boolean(result.supportCase),
      }])
      this.aiEnabled.set(result.mode === 'ai')
      this.persist()
    } catch (error: any) {
      this.error = error?.message || 'تعذر إرسال السؤال. حاول مرة أخرى.'
    } finally {
      this.busy.set(false)
      this.scrollToBottom()
    }
  }

  onComposerKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void this.send()
    }
  }

  resizeComposer(event: Event) { this.resizeTextarea(event.target as HTMLTextAreaElement) }

  private resizeTextarea(input: HTMLTextAreaElement) {
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`
  }

  async escalate(message: ChatMessage) {
    const question = [...this.messages()].reverse().find(item => item.role === 'user')?.content || 'حالة من مساعد الدعم'
    const periodId = this.payroll.currentPeriodId()
    if (!periodId) { this.error = 'اختر فترة الرواتب أولًا لتسجيل المشكلة.'; return }
    try {
      await firstValueFrom(this.http.post(environment.apiUrl + '/management', {
        periodId,
        problem: `حالة من مساعد الدعم\n\nالسؤال: ${question}\n\nملخص المساعد: ${message.content}`.slice(0, 4000),
      }))
      message.escalated = true
      this.messages.set([...this.messages()])
      this.persist()
    } catch (error: any) { this.error = error?.message || 'تعذر تسجيل المشكلة.' }
  }

  newChat() {
    this.messages.set([{ role: 'assistant', content: 'بدأنا محادثة جديدة. قولّي عايز تتكلم في إيه؟' }])
    this.draft = ''
    this.removeImage()
    this.error = ''
    this.persist()
  }

  sourceLabel(url: string) {
    if (url.includes('community-guidelines')) return 'إرشادات TikTok الرسمية'
    if (url.includes('account-status')) return 'فحص حالة الحساب'
    if (url.includes('content-violations')) return 'المخالفات والحظر'
    if (url.includes('age-requirements')) return 'شروط عمر LIVE'
    if (url.includes('commercial')) return 'المحتوى التجاري'
    if (url.includes('music')) return 'الموسيقى التجارية'
    if (url.includes('virtual-items')) return 'سياسة الهدايا والعناصر'
    return 'مصدر TikTok رسمي'
  }

  private storageKey() { return `temsah-support-chat:${this.auth.user()?.id || 'user'}` }
  private persist() {
    const safe = this.messages().slice(-30).map(({ role, content, sources, mode, notice, escalated, supportCase }) => ({ role, content, sources, mode, notice, escalated, supportCase }))
    try { localStorage.setItem(this.storageKey(), JSON.stringify(safe)) } catch {}
  }
  private scrollToBottom() {
    setTimeout(() => document.querySelector('.support-chat-messages')?.scrollTo({ top: 999999, behavior: 'smooth' }), 30)
  }
}
