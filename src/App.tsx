import { useState, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type NavSection =
  | 'dashboard'
  | 'topics'
  | 'meetings'
  | 'meeting-live'
  | 'minutes'
  | 'actions'

type TopicStatus = '待安排' | '已安排' | '锁定中' | '已上会'
type ActionStatus = '跟进中' | '待确认关闭' | '已关闭'
type MeetingStatus = '筹备中' | '进行中' | '已结束'
type Priority = '高' | '中' | '低'

interface Topic {
  id: string
  title: string
  submitter: string
  dept: string
  submittedAt: string
  status: TopicStatus
  priority: Priority
  background: string
  objective: string
  aiSummary: string
  decisionPoints: string[]
  presenter: string
  estimatedMins: number
  materials: string[]
}

interface MeetingTopic {
  topicId: string
  order: number
  customMins?: number
}

interface Meeting {
  id: string
  title: string
  typeId: string
  date: string
  time: string
  endTime: string
  location: string
  chair: string
  attendees: string[]
  meetingTopics: MeetingTopic[]
  status: MeetingStatus
  notes: string
}

interface ActionItem {
  id: string
  meetingId: string
  title: string
  description: string
  assignee: string
  follower: string
  dept: string
  assignedAt: string
  deadline: string
  status: ActionStatus
  monthlyReports: { month: string; content: string }[]
  createdAt: string
}

// ─── Meeting Types ────────────────────────────────────────────────────────────

const MEETING_TYPES = [
  { id: 'gm-office',    name: '总经理办公会',   desc: '集团总经理主持的综合性决策会议', color: '#1b365d', bg: '#eef2f6' },
  { id: 'party',        name: '党委会',         desc: '党委书记主持的党务决策会议',     color: '#8b3a3a', bg: '#f6eeee' },
  { id: 'board',        name: '董事会',         desc: '董事会成员参与的公司治理会议',   color: '#3d4a6b', bg: '#eef0f4' },
  { id: 'special',      name: '专题会议',       desc: '针对特定议题召开的专项研究会议', color: '#2c5f6e', bg: '#eef4f5' },
  { id: 'ops-review',   name: '经营分析会',     desc: '定期经营数据分析与研判会议',     color: '#2f5d4a', bg: '#eef4f1' },
  { id: 'coordination', name: '协调推进会',     desc: '跨部门重点项目协调推进会议',     color: '#8a5a2b', bg: '#f5f0ea' },
  { id: 'committee',    name: '专业委员会',     desc: '各专业委员会审议会议',           color: '#8a7340', bg: '#f4f0e6' },
  { id: 'other',        name: '其他集团级会议', desc: '其他有集团领导参加的会议',       color: '#5c6578', bg: '#f1f3f5' },
]

// ─── Attendee Groups ──────────────────────────────────────────────────────────

interface AttendeeGroup {
  id: string
  name: string
  desc: string
  typeIds: string[]   // which meeting types this group suits
  members: string[]
}

const INIT_ATTENDEE_GROUPS: AttendeeGroup[] = [
  {
    id: 'AG001', name: '总经理办公会常规组',
    desc: '适用于总经理办公会、专题会议',
    typeIds: ['gm-office', 'special'],
    members: ['马总（集团总经理）', '李副总（常务）', '张副总（运营）', '王总助', '各部门主要负责人'],
  },
  {
    id: 'AG002', name: '党委会核心成员组',
    desc: '适用于党委会',
    typeIds: ['party'],
    members: ['马总（党委书记）', '李副书记', '纪委书记', '组织部长', '宣传部长'],
  },
  {
    id: 'AG003', name: '董事会成员组',
    desc: '适用于董事会',
    typeIds: ['board'],
    members: ['马总（董事长）', '李总（执行董事）', '张董事', '王独立董事', '陈独立董事', '董事会秘书'],
  },
  {
    id: 'AG004', name: '经营分析会核心组',
    desc: '适用于经营分析会',
    typeIds: ['ops-review'],
    members: ['马总（集团总经理）', '李副总（常务）', '财务部长', '战略部长', '各业务板块负责人'],
  },
  {
    id: 'AG005', name: '协调推进会工作组',
    desc: '适用于跨部门协调推进会',
    typeIds: ['coordination'],
    members: ['分管副总', '项目负责人', '相关部门负责人', '办公室主任'],
  },
]

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INIT_TOPICS: Topic[] = [
  {
    id: 'T001',
    title: '2026年第三季度经营业绩分析与四季度策略部署',
    submitter: '李建国', dept: '战略发展部', submittedAt: '2026-08-05',
    status: '待安排', priority: '高',
    background: '集团三季度经营已收官，各板块业绩数据已完成核对，营收同比增长12.4%，净利润8.7亿元。需在总经理办公会上系统汇报并部署四季度策略。',
    objective: '审议三季度经营结果，批准四季度重点市场开拓预算及华北区整合方案。',
    aiSummary: '本议题汇报集团三季度核心经营指标，营收同比增长12.4%，净利润8.7亿元。提出四季度市场攻坚及成本管控举措，申请3.5亿元预算授权。',
    decisionPoints: ['是否批准四季度新市场开拓预算（3.5亿元）', '华北区业务整合方案审批', '年度KPI动态调整授权'],
    presenter: '李建国', estimatedMins: 25,
    materials: ['三季度业绩报告.pdf', '四季度策略PPT.pptx'],
  },
  {
    id: 'T002',
    title: '集团数字化转型三期项目立项申请',
    submitter: '张慧敏', dept: '信息技术部', submittedAt: '2026-08-06',
    status: '待安排', priority: '高',
    background: '集团数字化一、二期工程已于2025年完成验收，三期工程聚焦数据中台建设与智能决策升级，已完成可研报告及外部供应商评估。',
    objective: '申请三期工程正式立项，获批1.2亿元投资授权，组建项目管理委员会。',
    aiSummary: '申请数字化三期立项，总投资1.2亿元，建设周期18个月。建设统一数据中台、智能决策系统及移动办公平台，预计运营效率提升30%。',
    decisionPoints: ['立项审批（1.2亿元）', '项目管理委员会组建方案', '外部供应商入围名单确认'],
    presenter: '张慧敏', estimatedMins: 20,
    materials: ['数字化三期立项申请书.pdf', '技术方案评估报告.pdf', '投资收益分析.xlsx'],
  },
  {
    id: 'T003',
    title: '人力资源优化与薪酬体系改革方案',
    submitter: '王芳', dept: '人力资源部', submittedAt: '2026-08-06',
    status: '已安排', priority: '中',
    background: '当前薪酬体系建立于2019年，内部公平性问题突出，已影响核心人才留存。人力资源部历时6个月完成方案研究，已与各事业部充分沟通对齐。',
    objective: '审议并批准宽带薪酬改革方案，确认实施时间表及激励基金额度。',
    aiSummary: '提出宽带薪酬结构及绩效联动机制改革，影响员工约8600人，人力成本预计增加4200万元/年。方案已与各事业部对齐，待领导层批准实施。',
    decisionPoints: ['薪酬改革方案审批', '实施时间表确认', '配套激励基金额度授权'],
    presenter: '王芳', estimatedMins: 15,
    materials: ['薪酬改革方案.pdf', '标杆企业对标研究.pptx'],
  },
  {
    id: 'T004',
    title: '南方新能源子公司战略投资协议审批',
    submitter: '陈志远', dept: '投资发展部', submittedAt: '2026-08-07',
    status: '锁定中', priority: '高',
    background: '集团战略布局清洁能源赛道，南方新能源是广东、广西地区头部光伏运营商，已在两地完成装机1.2GW，标的估值稳健，现金流充沛。',
    objective: '审批初始参股投资6000万元、20%股权，获取后续跟投权，完成战略卡位。',
    aiSummary: '拟参股南方新能源6000万元获20%股权，布局清洁能源。标的公司装机1.2GW，现金流稳定。该议题已锁定，等待上会审议。',
    decisionPoints: ['投资金额及股权比例审批', '尽调报告确认', '后续跟投权条款授权'],
    presenter: '陈志远', estimatedMins: 20,
    materials: ['投资尽调报告.pdf', '标的公司财务数据.xlsx'],
  },
  {
    id: 'T005',
    title: '集团合规管理体系年度评估报告',
    submitter: '刘明', dept: '合规法务部', submittedAt: '2026-08-07',
    status: '已上会', priority: '低',
    background: '按集团年度合规管理要求，合规法务部完成年度合规体系全面评估，涵盖制度建设、人员培训、风险事件处置等维度。',
    objective: '向领导层汇报年度合规工作完成情况，确认评估结论并指导下一年度工作重点。',
    aiSummary: '年度合规评估报告，涉及制度建设、培训覆盖及风险事件处理。本议题已在7月办公会审议通过，结论良好，下年度重点关注数字合规领域。',
    decisionPoints: ['年度合规评估结果确认'],
    presenter: '刘明', estimatedMins: 10,
    materials: ['合规年度评估报告.pdf'],
  },
]

const INIT_MEETINGS: Meeting[] = [
  {
    id: 'M2026-08',
    title: '集团2026年8月总经理办公会',
    typeId: 'gm-office',
    date: '2026-08-15', time: '09:00', endTime: '12:00',
    location: '总部大厦28层第一会议室',
    chair: '马总（集团总经理）',
    attendees: ['马总（集团总经理）', '李副总（常务）', '张副总（运营）', '王总助', '李建国', '张慧敏', '王芳'],
    meetingTopics: [
      { topicId: 'T003', order: 1 },
      { topicId: 'T004', order: 2 },
    ],
    status: '筹备中',
    notes: '',
  },
  {
    id: 'M2026-07',
    title: '集团2026年7月总经理办公会',
    typeId: 'gm-office',
    date: '2026-07-18', time: '09:00', endTime: '11:30',
    location: '总部大厦28层第一会议室',
    chair: '马总（集团总经理）',
    attendees: ['马总（集团总经理）', '李副总（常务）', '张副总（运营）', '赵国栋', '孙丽华'],
    meetingTopics: [],
    status: '已结束',
    notes: '会议纪要已归档',
  },
]

const ACTIONS: ActionItem[] = [
  {
    id: 'A001', meetingId: 'M2026-07',
    title: '推进华东区域销售网络整合落地',
    description: '按照7月办公会决议，完成华东五省市销售渠道整合，统一品牌形象输出，建立区域协调联动机制。',
    assignee: '赵国栋', follower: '张副总（运营）', dept: '华东大区',
    assignedAt: '2026-07-20', deadline: '2026-10-31',
    status: '跟进中', createdAt: '2026-07-20',
    monthlyReports: [
      { month: '2026-07', content: '完成华东区域现状摸底调研，识别关键整合节点12处，制定整合路线图。' },
      { month: '2026-08', content: '江苏、上海渠道整合完成，浙江进入实施阶段，福建、江西完成前期谈判。' },
    ],
  },
  {
    id: 'A002', meetingId: 'M2026-07',
    title: '完成集团供应商资质动态评级体系建设',
    description: '建立供应商全生命周期管理平台，实现动态评级、预警推送及黑名单管理功能。',
    assignee: '孙丽华', follower: '李副总（常务）', dept: '采购管理部',
    assignedAt: '2026-07-20', deadline: '2026-09-30',
    status: '待确认关闭', createdAt: '2026-07-20',
    monthlyReports: [
      { month: '2026-07', content: '系统需求分析完毕，完成供应商数据清洗（共2847家）。' },
      { month: '2026-08', content: '平台开发完成，通过UAT测试，已正式上线运行，完成关闭申请提交。' },
    ],
  },
  {
    id: 'A003', meetingId: 'M2026-07',
    title: '集团安全生产隐患排查整改',
    description: '针对安全生产专项检查发现的37项隐患，制定分级整改计划，逐项完成销号。',
    assignee: '周建平', follower: '王总助', dept: '安全环保部',
    assignedAt: '2026-06-25', deadline: '2026-08-31',
    status: '跟进中', createdAt: '2026-06-25',
    monthlyReports: [
      { month: '2026-06', content: '完成隐患分级：A级5项，B级12项，C级20项。' },
      { month: '2026-07', content: 'A级隐患全部整改完毕，B级完成9项，C级完成18项。' },
      { month: '2026-08', content: 'B级剩余3项预计本月底前完成，C级全部销号。' },
    ],
  },
  {
    id: 'A005', meetingId: 'M2026-07',
    title: '员工持股计划（ESOP）方案设计',
    description: '制定第一期员工持股计划，覆盖核心骨干约500人，总规模不超过净资产的5%。',
    assignee: '王芳', follower: '李副总（常务）', dept: '人力资源部',
    assignedAt: '2026-05-18', deadline: '2026-07-31',
    status: '已关闭', createdAt: '2026-05-18',
    monthlyReports: [
      { month: '2026-05', content: '完成标杆企业研究，形成方案框架。' },
      { month: '2026-06', content: '完成方案设计，通过法律合规审查。' },
      { month: '2026-07', content: '董事会审议通过，完成工商变更登记，任务正式完成。' },
    ],
  },
]

const MEETING_TITLE_MAP: Record<string, string> = {
  'M2026-08': '集团2026年8月总经理办公会',
  'M2026-07': '集团2026年7月总经理办公会',
  'M2026-06': '2026年6月安全生产专题会',
  'M2026-05': '2026年5月人才发展专题会',
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const topicStatusColor: Record<TopicStatus, string> = {
  '待安排': 'bg-amber-50 text-amber-800 border border-amber-200',
  '已安排': 'bg-navy-50 text-navy-700 border border-navy-100',
  '锁定中': 'bg-orange-50 text-orange-800 border border-orange-200',
  '已上会': 'bg-emerald-50 text-emerald-800 border border-emerald-200',
}

const actionStatusColor: Record<ActionStatus, string> = {
  '跟进中': 'bg-navy-50 text-navy-700 border border-navy-100',
  '待确认关闭': 'bg-amber-50 text-amber-800 border border-amber-200',
  '已关闭': 'bg-emerald-50 text-emerald-800 border border-emerald-200',
}

const priorityColor: Record<Priority, string> = {
  '高': 'bg-red-50 text-red-700 border border-red-200',
  '中': 'bg-stone-50 text-stone-600 border border-stone-200',
  '低': 'bg-gray-50 text-gray-500 border border-gray-200',
}

const meetingStatusColor: Record<MeetingStatus, string> = {
  '筹备中': 'bg-navy-50 text-navy-700 border border-navy-100',
  '进行中': 'bg-gold-50 text-gold-600 border border-gold-100',
  '已结束': 'bg-gray-100 text-gray-500 border border-gray-200',
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`tag ${color}`}>{label}</span>
}

function SectionHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 22, fontWeight: 700, color: 'var(--foreground)', margin: '0 0 6px', letterSpacing: '0.02em' }}>
          {title}
        </h2>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function Card({ children, className = '', style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties
}) {
  return (
    <div className={className} style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '20px 24px',
      boxShadow: '0 1px 0 rgba(18, 32, 58, 0.03)', ...style,
    }}>
      {children}
    </div>
  )
}

function Btn({ label, variant = 'primary', onClick, icon, disabled = false, small = false }: {
  label: string; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  onClick?: () => void; icon?: string; disabled?: boolean; small?: boolean
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' },
    secondary: { background: '#fff', color: 'var(--primary)', border: '1px solid var(--border)' },
    ghost: { background: 'transparent', color: 'var(--muted-foreground)', border: '1px solid transparent' },
    danger: { background: '#fff', color: '#8b3a3a', border: '1px solid #e8d0d0' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        padding: small ? '5px 11px' : '8px 16px',
        borderRadius: 6,
        fontSize: small ? 12 : 13,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'inherit',
        transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
      onMouseOver={e => {
        if (disabled) return
        if (variant === 'primary') e.currentTarget.style.background = '#244a78'
        else if (variant === 'secondary' || variant === 'ghost') e.currentTarget.style.background = 'var(--secondary)'
        else e.currentTarget.style.background = '#f6eeee'
      }}
      onMouseOut={e => {
        e.currentTarget.style.background = String(styles[variant].background)
        e.currentTarget.style.opacity = disabled ? '0.5' : '1'
      }}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function ModalShell({
  title, kicker, extra, onClose, children, footer, width = 560, zIndex = 1000, expand = false,
}: {
  title: string
  kicker?: string
  extra?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
  zIndex?: number
  expand?: boolean
}) {
  return (
    <div className={`modal-overlay${expand ? ' is-expand' : ''}`} style={{ zIndex }} onClick={onClose}>
      <div className={`modal-panel${expand ? ' is-expand' : ''}`} style={{ width: `min(96vw, ${width}px)` }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            {kicker && <div className="modal-kicker">{kicker}</div>}
            <div className="modal-title">{title}</div>
          </div>
          {extra}
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}{required && <span className="field-req">*</span>}</label>
      {children}
    </div>
  )
}

function ModalFoot({ left, children }: { left?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: left ? 'space-between' : 'flex-end', width: '100%', gap: 8 }}>
      {left}
      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>{children}</div>
    </div>
  )
}

// ─── New Meeting Modal ────────────────────────────────────────────────────────

function NewMeetingModal({ onClose, onSave, defaultTypeId = 'gm-office' }: {
  onClose: () => void
  onSave: (m: Meeting) => void
  defaultTypeId?: string
}) {
  const typeMeta = MEETING_TYPES.find(t => t.id === defaultTypeId) ?? MEETING_TYPES[0]
  const [typeId, setTypeId] = useState(defaultTypeId)
  const [title, setTitle] = useState(`集团${typeMeta.name}`)
  const [date, setDate] = useState('2026-09-12')
  const [time, setTime] = useState('09:00')
  const [endTime, setEndTime] = useState('12:00')
  const [location, setLocation] = useState('总部大厦28层第一会议室')
  const [chair, setChair] = useState('马总（集团总经理）')
  const [attendees, setAttendees] = useState<string[]>([])
  const [attendeeInput, setAttendeeInput] = useState('')
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)

  const suggestedGroups = INIT_ATTENDEE_GROUPS.filter(g => g.typeIds.includes(typeId))

  const applyGroup = (g: AttendeeGroup) => {
    setActiveGroupId(g.id)
    setAttendees(g.members)
  }

  const addAttendee = () => {
    const v = attendeeInput.trim()
    if (v && !attendees.includes(v)) { setAttendees(a => [...a, v]); setAttendeeInput('') }
  }

  const handleSave = () => {
    const id = `M${date.replace(/-/g, '').slice(0, 6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    onSave({ id, title, typeId, date, time, endTime, location, chair, attendees, meetingTopics: [], status: '筹备中', notes: '' })
    onClose()
  }

  return (
    <ModalShell
      title="新建会议"
      kicker="会前准备"
      width={620}
      onClose={onClose}
      footer={
        <ModalFoot>
          <Btn label="取消" variant="ghost" onClick={onClose} />
          <Btn label="创建会议" variant="primary" onClick={handleSave} disabled={!title || !date} />
        </ModalFoot>
      }
    >
      <Field label="会议类型">
        <div className="choice-grid">
          {MEETING_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              className={`choice${typeId === t.id ? ' is-on' : ''}`}
              onClick={() => { setTypeId(t.id); setActiveGroupId(null); setTitle(`集团${t.name}`) }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="会议名称" required>
        <input className="field-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="如：集团2026年9月总经理办公会" />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12 }}>
        <Field label="会议日期">
          <input className="field-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="开始时间">
          <input className="field-input" type="time" value={time} onChange={e => setTime(e.target.value)} />
        </Field>
        <Field label="结束时间">
          <input className="field-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </Field>
      </div>

      <Field label="会议地点">
        <input className="field-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="如：总部大厦28层第一会议室" />
      </Field>
      <Field label="主持人">
        <input className="field-input" value={chair} onChange={e => setChair(e.target.value)} placeholder="如：马总（集团总经理）" />
      </Field>

      <Field label={`参会人员（${attendees.length}人）`}>
        {suggestedGroups.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 8 }}>常用人员组，点击导入</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {suggestedGroups.map(g => (
                <button
                  key={g.id}
                  type="button"
                  className={`choice${activeGroupId === g.id ? ' is-on' : ''}`}
                  style={{ minHeight: 32, width: 'auto', padding: '4px 10px', flex: '0 0 auto' }}
                  onClick={() => applyGroup(g)}
                >
                  {g.name}
                </button>
              ))}
            </div>
            {activeGroupId && (
              <div style={{ fontSize: 12, color: '#2f5d4a', marginTop: 8 }}>
                已导入「{INIT_ATTENDEE_GROUPS.find(g => g.id === activeGroupId)?.name}」，可继续增删
              </div>
            )}
          </div>
        )}
        {attendees.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, padding: 10, background: 'var(--muted)', borderRadius: 6 }}>
            {attendees.map(a => (
              <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#fff', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                {a}
                <button type="button" onClick={() => setAttendees(prev => prev.filter(x => x !== a))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
            <button type="button" onClick={() => { setAttendees([]); setActiveGroupId(null) }} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit' }}>清空</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="field-input"
            value={attendeeInput}
            onChange={e => setAttendeeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAttendee()}
            placeholder="输入姓名后按 Enter 临时加人"
            style={{ flex: 1 }}
          />
          <Btn label="添加" variant="secondary" onClick={addAttendee} />
        </div>
      </Field>
    </ModalShell>
  )
}

// ─── Topic Picker Modal ───────────────────────────────────────────────────────

function TopicPickerModal({ topics, alreadyPicked, onClose, onAdd }: {
  topics: Topic[]
  alreadyPicked: string[]
  onClose: () => void
  onAdd: (topicId: string) => void
}) {
  const available = topics.filter(t => (t.status === '待安排' || t.status === '已安排') && !alreadyPicked.includes(t.id))

  return (
    <ModalShell
      title="添加议题"
      kicker={`待安排 / 已安排 · ${available.length} 项`}
      width={620}
      onClose={onClose}
      footer={<ModalFoot><Btn label="关闭" variant="ghost" onClick={onClose} /></ModalFoot>}
    >
      {available.length === 0 && (
        <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--muted-foreground)', fontSize: 13 }}>
          暂无可安排的议题，请先在议题管理中提交申报
        </div>
      )}
      {available.map(t => (
        <div key={t.id} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted-foreground)' }}>{t.id}</span>
              <Badge label={t.priority} color={priorityColor[t.priority]} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{t.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{t.dept} · {t.presenter} · {t.estimatedMins} 分钟</div>
          </div>
          <Btn label="加入" variant="primary" small onClick={() => { onAdd(t.id); onClose() }} />
        </div>
      ))}
    </ModalShell>
  )
}

// ─── ActionTile ───────────────────────────────────────────────────────────────

function ActionTile({ label, desc, onClick, primary }: {
  label: string; desc: string; onClick: () => void; primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`choice${primary ? ' is-on' : ''}`}
      style={{ width: '100%', minHeight: 52, justifyContent: 'space-between', padding: '10px 12px' }}
    >
      <span style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{desc}</div>
      </span>
      <span style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}>→</span>
    </button>
  )
}

function LiveHead({ title, meta, extra }: { title: string; meta?: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="live-head">
      <span className="live-head-bar" />
      <span className="live-head-title">{title}</span>
      {meta && <span className="live-head-meta">{meta}</span>}
      {extra}
    </div>
  )
}

function DropZone({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
  return (
    <div
      className="dropzone"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
    >
      <div className="dropzone-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="2.5" width="8" height="4" rx="1" />
          <path d="M16 4.5h2A2.5 2.5 0 0 1 20.5 7v12.5A2.5 2.5 0 0 1 18 22H6a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 6 4.5h2" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      </div>
      <div className="dropzone-title">{title}</div>
      <div className="dropzone-hint">{hint}</div>
    </div>
  )
}

// ─── NotifyModal ──────────────────────────────────────────────────────────────

function NotifyModal({ meeting, onClose, onSend }: {
  meeting: Meeting
  onClose: () => void
  onSend: (channels: string[], leaders: string[]) => void
}) {
  const [channels, setChannels] = useState<string[]>(['robot'])
  const [leaders, setLeaders] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  const toggle = (arr: string[], val: string, set: React.Dispatch<React.SetStateAction<string[]>>) =>
    set(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])

  const leaderOptions = meeting.attendees.filter(a => a.includes('总') || a.includes('副') || a.includes('书记') || a.includes('董'))

  const handleSend = () => {
    setSending(true)
    setTimeout(() => { setSending(false); onSend(channels, leaders) }, 1400)
  }

  const ChkBox = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }): React.ReactElement => (
    <label className={`check-row${checked ? ' is-on' : ''}`} onClick={e => { e.preventDefault(); onChange() }}>
      <span className="check-box">{checked ? '✓' : ''}</span>
      <span style={{ fontSize: 13, color: checked ? 'var(--primary)' : 'var(--foreground)', fontWeight: checked ? 600 : 400 }}>{label}</span>
    </label>
  )

  return (
    <ModalShell
      title="发送会议通知"
      kicker={meeting.title}
      width={520}
      zIndex={1100}
      onClose={onClose}
      footer={
        <ModalFoot>
          <Btn label="取消" variant="ghost" onClick={onClose} />
          <Btn
            label={sending ? '发送中…' : '确认发送'}
            variant="primary"
            disabled={channels.length === 0 || sending || (channels.includes('leader') && leaders.length === 0)}
            onClick={handleSend}
          />
        </ModalFoot>
      }
    >
      <Field label="通知渠道（可多选）">
        <ChkBox checked={channels.includes('robot')} onChange={() => toggle(channels, 'robot', setChannels)} label="群机器人发到会议群" />
        <ChkBox checked={channels.includes('email')} onChange={() => toggle(channels, 'email', setChannels)} label="邮件通知全部参会人" />
        <ChkBox checked={channels.includes('leader')} onChange={() => toggle(channels, 'leader', setChannels)} label="钉钉工作通知推送给领导" />
      </Field>

      {channels.includes('leader') && leaderOptions.length > 0 && (
        <Field label="推送领导">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {leaderOptions.map(l => {
              const on = leaders.includes(l)
              return (
                <button key={l} type="button" className={`choice${on ? ' is-on' : ''}`} style={{ width: 'auto', minHeight: 32, padding: '4px 12px', flex: '0 0 auto' }} onClick={() => toggle(leaders, l, setLeaders)}>
                  {l}
                </button>
              )
            })}
          </div>
          {leaders.length === 0 && <div style={{ fontSize: 12, color: '#8a5a2b', marginTop: 8 }}>请至少选择一位领导</div>}
        </Field>
      )}

      <div style={{ background: 'var(--muted)', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.8 }}>
        <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: 6 }}>通知预览</div>
        <div>{meeting.title}</div>
        <div>时间：{meeting.date} {meeting.time}–{meeting.endTime}</div>
        <div>地点：{meeting.location}</div>
        <div>主持：{meeting.chair}</div>
      </div>
    </ModalShell>
  )
}

// ─── Meeting Detail View ──────────────────────────────────────────────────────

function MeetingDetail({ meeting, topics, onBack, onUpdate, onNav }: {
  meeting: Meeting
  topics: Topic[]
  onBack: () => void
  onUpdate: (m: Meeting) => void
  onNav: (s: NavSection) => void
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [actionToast, setActionToast] = useState('')
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const meetingTopics = [...meeting.meetingTopics].sort((a, b) => a.order - b.order)

  const fireToast = (msg: string) => { setActionToast(msg); setTimeout(() => setActionToast(''), 3200) }

  const totalMins = meetingTopics.reduce((s, mt) => {
    const t = topics.find(x => x.id === mt.topicId)
    return s + (mt.customMins ?? t?.estimatedMins ?? 0)
  }, 0)

  const startMins = (() => {
    const [h, m] = meeting.time.split(':').map(Number)
    return h * 60 + m
  })()

  const getTime = (offset: number) => {
    const t = startMins + offset
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  }

  const removeTopic = (topicId: string) => {
    const updated = {
      ...meeting,
      meetingTopics: meeting.meetingTopics
        .filter(mt => mt.topicId !== topicId)
        .map((mt, i) => ({ ...mt, order: i + 1 })),
    }
    onUpdate(updated)
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    const arr = [...meetingTopics]
    ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
    onUpdate({ ...meeting, meetingTopics: arr.map((x, i) => ({ ...x, order: i + 1 })) })
  }

  const moveDown = (idx: number) => {
    if (idx === meetingTopics.length - 1) return
    const arr = [...meetingTopics]
    ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    onUpdate({ ...meeting, meetingTopics: arr.map((x, i) => ({ ...x, order: i + 1 })) })
  }

  const updateMins = (topicId: string, mins: number) => {
    onUpdate({
      ...meeting,
      meetingTopics: meeting.meetingTopics.map(mt =>
        mt.topicId === topicId ? { ...mt, customMins: mins } : mt
      ),
    })
  }

  const addTopic = (topicId: string) => {
    onUpdate({
      ...meeting,
      meetingTopics: [...meeting.meetingTopics, { topicId, order: meeting.meetingTopics.length + 1 }],
    })
  }

  const pickedIds = meetingTopics.map(mt => mt.topicId)

  return (
    <div>
      {showPicker && (
        <TopicPickerModal
          topics={topics}
          alreadyPicked={pickedIds}
          onClose={() => setShowPicker(false)}
          onAdd={addTopic}
        />
      )}

      {/* ── 发送会议通知 Modal ── */}
      {showNotifyModal && (
        <NotifyModal
          meeting={meeting}
          onClose={() => setShowNotifyModal(false)}
          onSend={(channels, leaders) => {
            setShowNotifyModal(false)
            const parts = []
            if (channels.includes('robot')) parts.push('群机器人')
            if (channels.includes('email')) parts.push('邮件')
            if (channels.includes('leader') && leaders.length > 0) parts.push(`领导消息推送（${leaders.join('、')}）`)
            fireToast(`通知已发送：${parts.join('、')}`)
          }}
        />
      )}

      {/* Breadcrumb + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--muted-foreground)' }}>
        <span style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 500 }} onClick={onBack}>← 会议列表</span>
        <span>›</span>
        <span style={{ color: 'var(--foreground)' }}>{meeting.title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Left: agenda editor */}
        <div>
          {/* Meeting info banner */}
          <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius)', padding: '22px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -10, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 5, letterSpacing: '0.08em' }}>{meeting.id}</div>
                <div style={{ fontFamily: "'Noto Serif SC',serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{meeting.title}</div>
                <div className="meta">
                  <span>{meeting.date} {meeting.time}–{meeting.endTime}</span>
                  <span>{meeting.location}</span>
                  <span>主持 {meeting.chair}</span>
                </div>
              </div>
              <Badge label={meeting.status} color={meetingStatusColor[meeting.status]} />
            </div>
          </div>

          {/* Agenda card */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>议题安排</span>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>共 {meetingTopics.length} 项 · 合计 {totalMins} 分钟</span>
              </div>
              {meeting.status === '筹备中' && (
                <Btn label="+ 添加议题" variant="primary" onClick={() => setShowPicker(true)} />
              )}
            </div>

            {meetingTopics.length === 0 && (
              <div className="empty">暂未安排议题，可从已审查议题中添加</div>
            )}

            {(() => {
              let elapsed = 0
              return meetingTopics.map((mt, idx) => {
                const t = topics.find(x => x.id === mt.topicId)
                if (!t) return null
                const mins = mt.customMins ?? t.estimatedMins
                const topicStart = elapsed
                elapsed += mins
                return (
                  <div key={mt.topicId} style={{ borderBottom: idx < meetingTopics.length - 1 ? '1px solid var(--border)' : 'none', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      {/* Order badge */}
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        {idx + 1}
                      </div>

                      {/* Time column */}
                      <div style={{ width: 90, flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                          {getTime(topicStart)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                          结束 {getTime(topicStart + mins)}
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>{t.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 8 }}>
                          汇报人：{t.presenter} · {t.dept}
                        </div>
                        {/* AI summary collapsed */}
                        <div style={{ fontSize: 12, color: 'var(--primary)', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 5, padding: '6px 10px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {t.aiSummary}
                        </div>
                      </div>

                      {/* Mins editor */}
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <input
                            type="number"
                            min={5}
                            max={120}
                            value={mins}
                            onChange={e => updateMins(mt.topicId, Number(e.target.value))}
                            disabled={meeting.status !== '筹备中'}
                            style={{ width: 54, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', fontWeight: 600, color: 'var(--foreground)', background: '#fafbfd' }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>分钟</span>
                        </div>

                        {/* Priority */}
                        <Badge label={t.priority} color={priorityColor[t.priority]} />
                      </div>

                      {/* Controls */}
                      {meeting.status === '筹备中' && (
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <button
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                            title="上移"
                            style={{ width: 26, height: 26, border: '1px solid var(--border)', borderRadius: 4, background: idx === 0 ? '#f8f9fb' : 'var(--card)', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 12, color: idx === 0 ? '#ccc' : 'var(--foreground)' }}
                          >▲</button>
                          <button
                            onClick={() => moveDown(idx)}
                            disabled={idx === meetingTopics.length - 1}
                            title="下移"
                            style={{ width: 26, height: 26, border: '1px solid var(--border)', borderRadius: 4, background: idx === meetingTopics.length - 1 ? '#f8f9fb' : 'var(--card)', cursor: idx === meetingTopics.length - 1 ? 'not-allowed' : 'pointer', fontSize: 12, color: idx === meetingTopics.length - 1 ? '#ccc' : 'var(--foreground)' }}
                          >▼</button>
                          <button
                            onClick={() => removeTopic(mt.topicId)}
                            title="移除"
                            style={{ width: 26, height: 26, border: '1px solid #fecaca', borderRadius: 4, background: '#fef2f2', cursor: 'pointer', fontSize: 12, color: '#dc2626' }}
                          >✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            })()}

            {meetingTopics.length > 0 && (
              <div style={{ padding: '12px 20px', background: '#f8f9fb', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                  议程结束时间：<strong style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--foreground)' }}>{getTime(totalMins)}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                  预计结束：<strong>{getTime(totalMins)}</strong>
                  {totalMins > 180 && <span style={{ color: '#8b3a3a', marginLeft: 8 }}>超过 3 小时，建议精简议程</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Action toast */}
          {actionToast && (
            <div className="toast">{actionToast}</div>
          )}

          {/* Actions */}
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, fontFamily: "'Noto Serif SC',serif" }}>会议操作</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* 1. 创建日程 */}
              <ActionTile
                label="创建钉钉日程"
                desc="自动向参会人发送日历邀请"
                onClick={() => fireToast('钉钉日程已创建，参会人将收到日历邀请')}
              />
              <ActionTile
                label="一键拉群"
                desc="将参会人拉入钉钉群，便于通知"
                onClick={() => fireToast('已创建群聊并拉入全部参会人员')}
              />
              <ActionTile
                label="导出议程安排"
                desc="按模板生成 PDF / Word 议程"
                onClick={() => fireToast('议程已生成，正在下载…')}
              />
              <ActionTile
                label="发送会议通知"
                desc="群机器人、邮件、领导消息推送"
                onClick={() => setShowNotifyModal(true)}
                primary
              />

              {meeting.status === '筹备中' && (
                <Btn label="开始会议" variant="primary" onClick={() => onNav('meeting-live')} />
              )}
            </div>
          </Card>

          {/* Attendees */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>参会人员（{meeting.attendees.length}人）</div>
            </div>
            {meeting.attendees.map((name, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: ['#1b365d', '#3d4a6b', '#2f5d4a', '#8a5a2b', '#5c6578'][i % 5], color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {name[0]}
                </div>
                <div style={{ fontSize: 13 }}>{name}</div>
              </div>
            ))}
          </Card>

          {/* Time distribution */}
          {meetingTopics.length > 0 && (
            <Card>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>时间分配</div>
              {meetingTopics.map((mt, i) => {
                const t = topics.find(x => x.id === mt.topicId)!
                const mins = mt.customMins ?? t.estimatedMins
                const pct = (mins / totalMins) * 100
                return (
                  <div key={mt.topicId} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--muted-foreground)', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {i + 1}. {t.title}
                      </span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{mins}min</span>
                    </div>
                    <div style={{ background: '#f0f2f7', borderRadius: 3, height: 6 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 3, opacity: 1 - i * 0.15 }} />
                    </div>
                  </div>
                )
              })}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted-foreground)' }}>合计时长</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--primary)' }}>{totalMins} 分钟</span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Meetings List View ───────────────────────────────────────────────────────

// Avatar row for meeting type cards
function AvatarRow({ names, max = 4 }: { names: string[]; max?: number }) {
  const colors = ['#1b365d','#2f5d4a','#8a5a2b','#3d4a6b','#8b3a3a','#2c5f6e']
  const shown = names.slice(0, max)
  const extra = names.length - max
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((n, i) => (
        <div key={n} style={{ width: 26, height: 26, borderRadius: '50%', background: colors[i % colors.length], color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', marginLeft: i === 0 ? 0 : -6, zIndex: shown.length - i }}>
          {n.slice(0, 1)}
        </div>
      ))}
      {extra > 0 && (
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#94a3b8', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', marginLeft: -6 }}>
          +{extra}
        </div>
      )}
    </div>
  )
}

// Meetings list for a specific type
function MeetingTypeList({ typeId, meetings, topics, onBack, onDetail, onNew, onNav }: {
  typeId: string
  meetings: Meeting[]
  topics: Topic[]
  onBack: () => void
  onDetail: (id: string) => void
  onNew: () => void
  onNav: (s: NavSection) => void
}) {
  const typeMeta = MEETING_TYPES.find(t => t.id === typeId)!
  const typeMeetings = meetings.filter(m => m.typeId === typeId)
  const statusOrder: MeetingStatus[] = ['进行中', '筹备中', '已结束']
  const sorted = [...typeMeetings].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--card)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: 'var(--muted-foreground)' }}>
          ← 返回
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Noto Serif SC',serif" }}>{typeMeta.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{typeMeta.desc} · 共 {typeMeetings.length} 场会议</div>
        </div>
        <Btn label="+ 新建会议" variant="primary" onClick={onNew} />
      </div>

      {sorted.length === 0 && (
        <div className="empty">
          暂无{typeMeta.name}记录
          <div style={{ marginTop: 14 }}><Btn label="新建会议" variant="primary" onClick={onNew} /></div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map(m => {
          const topicCount = m.meetingTopics.length
          const totalMins = m.meetingTopics.reduce((s, mt) => {
            const t = topics.find(x => x.id === mt.topicId)
            return s + (mt.customMins ?? t?.estimatedMins ?? 0)
          }, 0)
          return (
            <div key={m.id} onClick={() => onDetail(m.id)} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 22px', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: 20 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <Badge label={m.status} color={meetingStatusColor[m.status]} />
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: 'var(--muted-foreground)' }}>{m.id}</span>
                  </div>
                  <div style={{ fontFamily: "'Noto Serif SC',serif", fontSize: 15, fontWeight: 700, marginBottom: 7 }}>{m.title}</div>
                  <div className="meta">
                    <span>{m.date} {m.time}–{m.endTime}</span>
                    <span>{m.location}</span>
                    <span>{m.chair}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
                  <AvatarRow names={m.attendees} />
                  <div style={{ textAlign: 'center', padding: '8px 14px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 6 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)', fontFamily: 'JetBrains Mono,monospace' }}>{topicCount}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>议题</div>
                  </div>
                </div>
              </div>
              {topicCount > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[...m.meetingTopics].sort((a, b) => a.order - b.order).map((mt, i) => {
                    const t = topics.find(x => x.id === mt.topicId)
                    if (!t) return null
                    return (
                      <div key={mt.topicId} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 9px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 11 }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{i + 1}</span>
                        <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--foreground)' }}>{t.title}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                <Btn label="查看/编辑" variant="secondary" small onClick={() => onDetail(m.id)} />
                {m.status !== '已结束' && <Btn label="进入会中" variant="primary" small onClick={() => onNav('meeting-live')} />}
                {m.status === '已结束' && <Btn label="查看纪要" variant="ghost" small onClick={() => onNav('minutes')} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MeetingsView({ topics, onNav }: { topics: Topic[]; onNav: (s: NavSection) => void }) {
  const [meetings, setMeetings] = useState<Meeting[]>(INIT_MEETINGS)
  const [showNew, setShowNew] = useState(false)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const detailMeeting = meetings.find(m => m.id === detailId) ?? null
  const updateMeeting = (updated: Meeting) => setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m))
  const addMeeting = (m: Meeting) => setMeetings(prev => [m, ...prev])

  if (detailMeeting) {
    return (
      <MeetingDetail
        meeting={detailMeeting}
        topics={topics}
        onBack={() => setDetailId(null)}
        onUpdate={updateMeeting}
        onNav={onNav}
      />
    )
  }

  if (selectedTypeId) {
    return (
      <>
        {showNew && (
          <NewMeetingModal
            defaultTypeId={selectedTypeId}
            onClose={() => setShowNew(false)}
            onSave={addMeeting}
          />
        )}
        <MeetingTypeList
          typeId={selectedTypeId}
          meetings={meetings}
          topics={topics}
          onBack={() => setSelectedTypeId(null)}
          onDetail={id => setDetailId(id)}
          onNew={() => setShowNew(true)}
          onNav={onNav}
        />
      </>
    )
  }

  // ── Type grid (entry screen) ──
  return (
    <div>
      {showNew && <NewMeetingModal onClose={() => setShowNew(false)} onSave={addMeeting} />}

      <SectionHeader
        title="会议管理"
        subtitle="请选择会议模块，点击模块进入对应会议的管理"
        action={<Btn label="+ 新建会议" variant="primary" onClick={() => setShowNew(true)} />}
      />

      <div className="type-grid">
        {MEETING_TYPES.map((type, i) => {
          const typeMeetings = meetings.filter(m => m.typeId === type.id)
          const statusOrder: MeetingStatus[] = ['进行中', '筹备中', '已结束']
          const latest = [...typeMeetings].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))[0]
          const allAttendees = latest?.attendees ?? []

          const statusBadgeColor = latest?.status === '进行中'
            ? { bg: '#faf6ec', text: '#9a7b3a', border: '#f4ecd8' }
            : latest?.status === '筹备中'
            ? { bg: '#eef2f6', text: '#1b365d', border: '#d8e0ea' }
            : { bg: '#f4f5f7', text: '#6b7380', border: '#e6e8ec' }

          return (
            <div
              key={type.id}
              className="type-card"
              style={{ ['--type-color' as string]: type.color, ['--type-bg' as string]: type.bg }}
              onClick={() => setSelectedTypeId(type.id)}
            >
              <div className="type-card-kicker">
                <span className="type-card-idx">{String(i + 1).padStart(2, '0')}</span>
                <span className="type-card-count">{typeMeetings.length} 场</span>
              </div>
              <div className="type-card-name">{type.name}</div>
              <div className="type-card-desc">{type.desc}</div>

              {latest ? (
                <div className="type-card-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: statusBadgeColor.bg, color: statusBadgeColor.text, border: `1px solid ${statusBadgeColor.border}` }}>
                      {latest.status}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--foreground)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{latest.title}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{latest.date} {latest.time}</span>
                    <AvatarRow names={allAttendees} />
                  </div>
                </div>
              ) : (
                <div className="type-card-panel is-empty">
                  尚未安排会议
                  <strong>进入后可新建</strong>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function ProgressRing({ pct, color, center }: { pct: number; color: string; center: string }) {
  const size = 68
  const r = 26
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pct))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8edf3" strokeWidth="7" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(p / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={color} fontFamily="JetBrains Mono, monospace">{center}</text>
    </svg>
  )
}

function Dashboard({ onNav }: { onNav: (s: NavSection) => void }) {
  const kpis = [
    { label: '本月会议', value: '3 场', tag: '推进中', tone: 'navy', sub: '计划 3 场，已完成 1 场', pct: 33, ring: '33%', color: '#1b365d' },
    { label: '待审议议题', value: '4 项', tag: '待安排', tone: 'gold', sub: '本月已收到 5 份申报', pct: 80, ring: '4', color: '#c4a35a' },
    { label: '进行中交办', value: '8 项', tag: '逾期风险', tone: 'warn', sub: '跟进中 8 项，逾期风险 2 项', pct: 25, ring: '8', color: '#8b3a3a' },
    { label: '本月已关闭', value: '85%', tag: '正常关闭', tone: 'ok', sub: '已关闭 3 项，按时关闭率 85%', pct: 85, ring: '85%', color: '#2f5d4a' },
  ]

  return (
    <div>
      <SectionHeader
        title="总经理办公会管理驾驶舱"
        subtitle={`${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} · 集团总部`}
      />

      <div className="kpi-grid">
        {kpis.map(s => (
          <div key={s.label} className="kpi-card">
            <ProgressRing pct={s.pct} color={s.color} center={s.ring} />
            <div className="kpi-body">
              <div className="kpi-label">{s.label}</div>
              <div className="kpi-row">
                <span className="kpi-value" style={{ color: s.color }}>{s.value}</span>
                <span className={`kpi-tag is-${s.tone}`}>{s.tag}</span>
              </div>
              <div className="kpi-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Noto Serif SC', serif" }}>即将召开 · 8月办公会</div>
              <div className="meta" style={{ marginTop: 6 }}>
                <span>2026-08-15 09:00</span>
                <span>总部大厦28层第一会议室</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="kpi-tag is-navy">筹备中</span>
              <Btn label="进入会议" variant="secondary" small onClick={() => onNav('meetings')} />
            </div>
          </div>
          {INIT_TOPICS.slice(0, 3).map((t, i) => (
            <div key={t.id} className="dash-item">
              <div className="dash-num">{String(i + 1).padStart(2, '0')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{t.presenter} · {t.estimatedMins} 分钟</div>
                <div style={{ marginTop: 6 }}><Badge label={t.status} color={topicStatusColor[t.status]} /></div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <Btn label="进入会中管控" variant="primary" onClick={() => onNav('meeting-live')} />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Noto Serif SC', serif" }}>交办事项跟踪</div>
            <Btn label="全部" variant="ghost" small onClick={() => onNav('actions')} />
          </div>
          {ACTIONS.filter(a => a.status !== '已关闭').slice(0, 4).map(a => (
            <div key={a.id} className="dash-person">
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{a.assignee[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{a.assignee}（{a.dept}）· 截止 {a.deadline}</div>
              </div>
              <Badge label={a.status} color={actionStatusColor[a.status]} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

const DEPTS = ['战略发展部', '信息技术部', '人力资源部', '投资发展部', '合规法务部', '财务管理部', '市场营销部', '供应链管理部', '安全环保部', '集团管控部']

function _SubmitTopicModal_UNUSED({ onClose, onSave }: {
  onClose: () => void
  onSave: (t: Topic) => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState({
    title: '',
    dept: '',
    submitter: '',
    presenter: '',
    priority: '中' as Priority,
    estimatedMins: 20,
    background: '',
    objective: '',
    decisionPoint1: '',
    decisionPoint2: '',
    decisionPoint3: '',
  })
  const [files, setFiles] = useState<{ id: number; name: string; size: string }[]>([])
  const [fileInput, setFileInput] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiDone, setAiDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const nextFileId = useRef(1)

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const generateAI = () => {
    setAiGenerating(true)
    setTimeout(() => { setAiGenerating(false); setAiDone(true) }, 1600)
  }

  // Simulate picking files via the hidden input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    const newEntries = picked.map(f => ({
      id: nextFileId.current++,
      name: f.name,
      size: f.size > 1024 * 1024
        ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
        : `${(f.size / 1024).toFixed(0)} KB`,
    }))
    setFiles(prev => [...prev, ...newEntries])
    e.target.value = ''
  }

  // Also allow typing a filename manually (for demo convenience)
  const addManual = () => {
    const name = fileInput.trim()
    if (!name) return
    setFiles(prev => [...prev, { id: nextFileId.current++, name, size: '—' }])
    setFileInput('')
  }

  const removeFile = (id: number) => setFiles(prev => prev.filter(f => f.id !== id))

  const fileIcon = (name: string) => {
    if (name.endsWith('.pdf')) return 'PDF'
    if (name.match(/\.(ppt|pptx)$/)) return 'PPT'
    if (name.match(/\.(xls|xlsx)$/)) return 'XLS'
    if (name.match(/\.(doc|docx)$/)) return 'DOC'
    return 'FILE'
  }

  const handleSubmit = () => {
    const id = `T${String(Math.floor(Math.random() * 900) + 100)}`
    const dps = [form.decisionPoint1, form.decisionPoint2, form.decisionPoint3].filter(Boolean)
    onSave({
      id,
      title: form.title,
      submitter: form.submitter,
      dept: form.dept,
      submittedAt: new Date().toISOString().slice(0, 10),
      status: '待安排',
      priority: form.priority,
      aiSummary: aiDone
        ? `本议题由${form.dept}${form.submitter}提报，核心目标为${form.objective.slice(0, 40)}。涉及决策事项${dps.length}项，汇报人为${form.presenter || form.submitter}，预计汇报时长${form.estimatedMins}分钟。`
        : form.background.slice(0, 120) || '（暂无概要）',
      background: '', objective: '',
      decisionPoints: dps.length > 0 ? dps : ['待补充决策点'],
      presenter: form.presenter || form.submitter,
      estimatedMins: form.estimatedMins,
      materials: files.map(f => f.name),
    })
    onClose()
  }

  const canNext1 = form.title && form.dept && form.submitter
  const canNext2 = form.background && form.objective

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
    borderRadius: 5, fontSize: 13, color: 'var(--foreground)',
    background: '#fafbfd', fontFamily: 'inherit', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 5, display: 'block',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--card)', borderRadius: 10, width: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>

        {/* Header */}
        <div style={{ background: 'var(--primary)', color: '#fff', padding: '18px 26px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>议题申报</div>
            <div style={{ fontFamily: "'Noto Serif SC',serif", fontSize: 16, fontWeight: 700 }}>
              {step === 1 ? '第一步：基本信息' : step === 2 ? '第二步：议题内容' : '第三步：上传材料'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 22, opacity: 0.7, lineHeight: 1 }}>×</button>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[{ n: 1, label: '基本信息' }, { n: 2, label: '议题内容' }, { n: 3, label: '上传材料' }].map((s, i) => (
            <div key={s.n} style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '11px 18px', gap: 8, borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: step >= s.n ? 'var(--primary)' : '#cbd5e1', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {step > s.n ? '✓' : s.n}
              </div>
              <span style={{ fontSize: 12, fontWeight: step === s.n ? 600 : 400, color: step === s.n ? 'var(--primary)' : '#9ca3af' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px' }}>

          {/* ── Step 1: 基本信息 ── */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>议题标题 <span style={{ color: '#dc2626' }}>*</span></label>
                <input value={form.title} onChange={e => set('title', e.target.value)}
                  placeholder="请用一句话概括，例如：集团XX项目立项审批"
                  style={fieldStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>提报部门 <span style={{ color: '#dc2626' }}>*</span></label>
                  <select value={form.dept} onChange={e => set('dept', e.target.value)} style={fieldStyle}>
                    <option value="">-- 请选择 --</option>
                    {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>提报人 <span style={{ color: '#dc2626' }}>*</span></label>
                  <input value={form.submitter} onChange={e => set('submitter', e.target.value)} placeholder="姓名" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>汇报人</label>
                  <input value={form.presenter} onChange={e => set('presenter', e.target.value)} placeholder="默认与提报人相同" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>预计汇报时长（分钟）</label>
                  <input type="number" min={5} max={90} value={form.estimatedMins} onChange={e => set('estimatedMins', Number(e.target.value))} style={fieldStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>优先级</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['高', '中', '低'] as Priority[]).map(p => (
                    <button key={p} onClick={() => set('priority', p)} style={{ flex: 1, padding: '8px 0', borderRadius: 5, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: form.priority === p ? `2px solid var(--primary)` : '1px solid var(--border)', background: form.priority === p ? 'var(--secondary)' : 'var(--card)', color: form.priority === p ? 'var(--primary)' : 'var(--muted-foreground)' }}>
                      {p === '高' ? '● 高' : p === '中' ? '● 中' : '● 低'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: 议题内容 ── */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>议题背景 <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea value={form.background} onChange={e => set('background', e.target.value)}
                  placeholder="说明议题产生的背景、现状问题或机会..."
                  rows={4} style={{ ...fieldStyle, resize: 'none', lineHeight: 1.7 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>汇报目标 <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea value={form.objective} onChange={e => set('objective', e.target.value)}
                  placeholder="本次上会希望达成什么目标？例如：审批立项、方案确认、资源授权..."
                  rows={3} style={{ ...fieldStyle, resize: 'none', lineHeight: 1.7 }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>主要决策点（最多3条，选填）</label>
                {[1, 2, 3].map(n => (
                  <div key={n} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
                    <input value={form[`decisionPoint${n}` as 'decisionPoint1']}
                      onChange={e => set(`decisionPoint${n}`, e.target.value)}
                      placeholder={`决策点 ${n}`}
                      style={fieldStyle} />
                  </div>
                ))}
              </div>

              {/* AI Summary */}
              <div style={{ background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiDone ? 12 : 0 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>AI 辅助生成议题概要</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>基于填写内容自动提炼摘要，供参会领导快速预览</div>
                  </div>
                  <Btn label={aiGenerating ? '生成中...' : aiDone ? '重新生成' : '立即生成'} variant="secondary" disabled={aiGenerating || !form.background} onClick={generateAI} />
                </div>
                {aiGenerating && (
                  <div style={{ marginTop: 12, fontSize: 13, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 13, height: 13, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    AI 正在分析议题内容...
                  </div>
                )}
                {aiDone && (
                  <div style={{ marginTop: 12, fontSize: 12, color: '#374151', lineHeight: 1.8, background: 'rgba(255,255,255,0.75)', borderRadius: 6, padding: '10px 14px' }}>
                    本议题由{form.dept || '[部门]'}{form.submitter || '[提报人]'}提报，核心目标为"{form.objective.slice(0, 50) || '[目标]'}{form.objective.length > 50 ? '...' : ''}"。涉及决策事项{[form.decisionPoint1, form.decisionPoint2, form.decisionPoint3].filter(Boolean).length || 1}项，汇报人为{form.presenter || form.submitter || '[汇报人]'}，预计{form.estimatedMins}分钟。
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: 上传材料 ── */}
          {step === 3 && (
            <div>
              <div style={{ marginBottom: 6 }}>
                <label style={labelStyle}>汇报材料（可上传多个文件）</label>
              </div>

              {/* Drop zone — triggers real file input */}
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div style={{ marginBottom: 14 }}>
                <DropZone
                  title="点击选择文件，或拖拽到此处"
                  hint="支持 PDF · PPT · PPTX · DOCX · XLSX，单文件不超过 50MB"
                  onClick={() => fileRef.current?.click()}
                />
              </div>

              {/* Manual filename entry for demo */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={fileInput}
                  onChange={e => setFileInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addManual()}
                  placeholder="或手动输入文件名后按 Enter（演示用）"
                  style={{ ...fieldStyle, flex: 1 }}
                />
                <Btn label="添加" variant="secondary" onClick={addManual} />
              </div>

              {/* File list */}
              {files.length === 0 && (
                <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>暂未添加任何文件</div>
              )}
              {files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  {files.map((f, i) => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 7 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{fileIcon(f.name)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{f.size}</div>
                      </div>
                      <span style={{ fontSize: 11, color: '#059669', fontWeight: 500, flexShrink: 0 }}>✓ 已添加</span>
                      <button onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirmation summary */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>申报信息确认</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                  {[
                    ['议题标题', form.title || '—'],
                    ['提报部门', form.dept || '—'],
                    ['提报人', form.submitter || '—'],
                    ['汇报人', form.presenter || form.submitter || '—'],
                    ['优先级', form.priority],
                    ['预计时长', `${form.estimatedMins} 分钟`],
                    ['决策点', `${[form.decisionPoint1, form.decisionPoint2, form.decisionPoint3].filter(Boolean).length} 条`],
                    ['附件', `${files.length} 个`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 4 }}>
                      <span style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}>{k}：</span>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 26px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>步骤 {step} / 3</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 1 && <Btn label="← 上一步" variant="ghost" onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)} />}
            <Btn label="取消" variant="ghost" onClick={onClose} />
            {step < 3 && <Btn label="下一步 →" variant="primary" disabled={step === 1 ? !canNext1 : !canNext2} onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)} />}
            {step === 3 && <Btn label="提交申报" variant="primary" disabled={!form.title || !form.dept || !form.submitter} onClick={handleSubmit} />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Topics View ──────────────────────────────────────────────────────────────

// ─── Topic Form Modal ─────────────────────────────────────────────────────────

function TopicFormModal({ topic, onClose, onSave, onLock }: {
  topic: Topic | null
  onClose: () => void
  onSave: (t: Topic) => void
  onLock?: (id: string) => void
}) {
  const isCreate = topic === null
  const isEditable = isCreate || topic.status === '待安排' || topic.status === '已安排'

  const [form, setForm] = useState({
    title: topic?.title ?? '',
    dept: topic?.dept ?? '',
    submitter: topic?.submitter ?? '',
    presenter: topic?.presenter ?? '',
    priority: (topic?.priority ?? '中') as Priority,
    estimatedMins: topic?.estimatedMins ?? 20,
    background: topic?.background ?? '',
    objective: topic?.objective ?? '',
    dp1: topic?.decisionPoints[0] ?? '',
    dp2: topic?.decisionPoints[1] ?? '',
    dp3: topic?.decisionPoints[2] ?? '',
  })
  const [files, setFiles] = useState<{ id: number; name: string; size: string }[]>(
    topic?.materials.map((m, i) => ({ id: i, name: m, size: '—' })) ?? []
  )
  const fileRef = useRef<HTMLInputElement>(null)
  const nextId = useRef(topic?.materials.length ?? 0)

  const [aiTextOpen, setAiTextOpen] = useState(false)
  const [aiTextInput, setAiTextInput] = useState('')
  const [aiTextLoading, setAiTextLoading] = useState(false)
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'processing'>('idle')
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
  const [aiSummaryDone, setAiSummaryDone] = useState(!!topic?.aiSummary)
  const [aiSummaryText, setAiSummaryText] = useState(topic?.aiSummary ?? '')
  const [step, setStep] = useState<1 | 2>(1)
  const [dpShown, setDpShown] = useState(() => {
    const n = topic?.decisionPoints.filter(Boolean).length ?? 0
    return Math.max(1, n || (topic === null ? 1 : 3))
  })

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const extractFromText = (text: string) => {
    const lines = text.split(/[。！\n]/).filter(Boolean)
    const deptMatch = text.match(/([一-龥]{2,8}部|[一-龥]{2,8}室|[一-龥]{2,6}中心)/)
    const personMatch = text.match(/([张李王赵刘陈杨黄周吴马孙][^\s，。！,]{1,3})(?:提报|汇报|负责|主导)/)
    setForm(f => ({
      ...f,
      title: lines[0]?.slice(0, 40) || f.title,
      dept: deptMatch?.[1] || f.dept,
      submitter: personMatch?.[1] || f.submitter,
      background: text.slice(0, 300),
      objective: lines[1]?.slice(0, 100) || f.objective,
      dp1: lines[2]?.slice(0, 60) || f.dp1,
    }))
    setAiSummaryDone(false); setAiSummaryText('')
  }

  const runAiExtract = () => {
    if (!aiTextInput.trim()) return
    setAiTextLoading(true)
    setTimeout(() => { extractFromText(aiTextInput); setAiTextLoading(false); setAiTextOpen(false); setAiTextInput('') }, 1400)
  }

  const startVoice = () => {
    setVoiceState('recording')
    voiceTimerRef.current = setTimeout(() => {
      setVoiceState('processing')
      setTimeout(() => {
        const mockText = '信息技术部张慧敏提报，集团ERP系统升级改造项目立项申请。本次申请对集团现有ERP系统进行全面升级，预计投入2000万元，建设周期12个月。目标是提升业务处理效率30%以上。主要决策点：项目预算审批。'
        extractFromText(mockText)
        setForm(f => ({ ...f, dept: '信息技术部', submitter: '张慧敏', title: '集团ERP系统升级改造项目立项申请', estimatedMins: 20 }))
        setVoiceState('idle')
      }, 1200)
    }, 3000)
  }

  const stopVoice = () => { if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current); setVoiceState('idle') }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    setFiles(prev => [...prev, ...picked.map(f => ({
      id: nextId.current++, name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
    }))])
    e.target.value = ''
  }

  const fileIcon = (name: string) => name.endsWith('.pdf') ? 'PDF' : name.match(/pptx?$/) ? 'PPT' : name.match(/xlsx?$/) ? 'XLS' : 'DOC'

  const generateSummary = () => {
    setAiSummaryLoading(true)
    setTimeout(() => {
      const dps = [form.dp1, form.dp2, form.dp3].filter(Boolean)
      const s = `本议题由${form.dept || '[部门]'}${form.submitter || '[提报人]'}提报，核心目标为"${(form.objective || form.background).slice(0, 50)}"。涉及决策事项${dps.length || 1}项，汇报人为${form.presenter || form.submitter || '[汇报人]'}，预计${form.estimatedMins}分钟。`
      setAiSummaryText(s); setAiSummaryLoading(false); setAiSummaryDone(true)
    }, 1500)
  }

  const handleSave = () => {
    const dps = [form.dp1, form.dp2, form.dp3].filter(Boolean)
    const saved: Topic = {
      id: topic?.id ?? `T${String(Math.floor(Math.random() * 900) + 100)}`,
      title: form.title, submitter: form.submitter, dept: form.dept,
      submittedAt: topic?.submittedAt ?? new Date().toISOString().slice(0, 10),
      status: topic?.status ?? '待安排', priority: form.priority,
      background: form.background, objective: form.objective,
      aiSummary: aiSummaryDone ? aiSummaryText : (topic?.aiSummary ?? (form.background.slice(0, 120) || '（暂无概要）')),
      decisionPoints: dps.length > 0 ? dps : ['待补充'],
      presenter: form.presenter || form.submitter,
      estimatedMins: form.estimatedMins,
      materials: files.map(f => f.name),
    }
    onSave(saved)
    onClose()
  }

  const canSave = form.title && form.dept && form.submitter && form.background
  const canNext = canSave
  const inputCls = `field-input${!isEditable ? ' is-ro' : ''}`
  const showBasics = !isCreate || step === 1
  const showExtra = !isCreate || step === 2

  const footerLeft = (
    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
      {isCreate
        ? (step === 1 ? '先填必填项，其余可稍后补充' : '以下均为选填，可直接提交')
        : isEditable ? '修改后请保存' : '该议题已锁定，仅可查看'}
    </span>
  )

  const assistBar = isEditable && (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>可用文字或语音自动填入</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn label={aiTextOpen ? '收起' : '从文字提取'} variant="secondary" small onClick={() => setAiTextOpen(v => !v)} />
        <Btn
          label={voiceState === 'idle' ? '语音填报' : voiceState === 'recording' ? '录音中…' : '识别中…'}
          variant={voiceState === 'idle' ? 'ghost' : 'danger'}
          small
          onClick={() => voiceState === 'idle' ? startVoice() : stopVoice()}
        />
      </div>
    </div>
  )

  const extractBox = isEditable && aiTextOpen && (
    <div className="form-sec" style={{ paddingBottom: 12 }}>
      <textarea className="field-area" rows={3} value={aiTextInput} onChange={e => setAiTextInput(e.target.value)} placeholder="例如：战略发展部李建国提报，集团三季度业绩汇报…" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <Btn label="取消" variant="ghost" small onClick={() => { setAiTextOpen(false); setAiTextInput('') }} />
        <Btn label={aiTextLoading ? '提取中…' : '提取填入'} variant="primary" small disabled={aiTextLoading || !aiTextInput.trim()} onClick={runAiExtract} />
      </div>
    </div>
  )

  return (
    <ModalShell
      title={isCreate ? '议题申报' : (form.title || '议题详情')}
      kicker={isCreate ? '只需 4 项必填' : `议题详情 · ${topic.id}`}
      extra={!isCreate ? <Badge label={topic.status} color={topicStatusColor[topic.status]} /> : undefined}
      width={920}
      expand
      onClose={onClose}
      footer={
        <ModalFoot left={footerLeft}>
          <Btn label="关闭" variant="ghost" onClick={onClose} />
          {isCreate && step === 2 && <Btn label="上一步" variant="ghost" onClick={() => setStep(1)} />}
          {!isCreate && topic.status === '已安排' && onLock && (
            <Btn label="锁定议题" variant="danger" onClick={() => { onLock(topic.id); onClose() }} />
          )}
          {isCreate && step === 1 && (
            <Btn label="下一步" variant="primary" disabled={!canNext} onClick={() => setStep(2)} />
          )}
          {isEditable && (!isCreate || step === 2) && (
            <Btn label={isCreate ? '提交申报' : '保存修改'} variant="primary" disabled={!canSave} onClick={handleSave} />
          )}
        </ModalFoot>
      }
    >
      {isCreate && isEditable && (
        <div className="form-steps">
          <button type="button" className={`form-step${step === 1 ? ' is-on' : ''}`} onClick={() => setStep(1)}>
            <span className="form-step-n">1</span>基本信息
          </button>
          <button type="button" className={`form-step${step === 2 ? ' is-on' : ''}`} onClick={() => canNext && setStep(2)}>
            <span className="form-step-n">2</span>补充信息（选填）
          </button>
        </div>
      )}

      {showBasics && (
        <>
          {assistBar}
          {extractBox}
          <div className="form-sec">
            <div className="form-sec-title">基本信息 <span>带 * 为必填</span></div>
            <Field label="议题标题" required={isEditable}>
              <input className={inputCls} readOnly={!isEditable} value={form.title} onChange={e => set('title', e.target.value)} placeholder="一句话概括，例如：集团XX项目立项审批" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="提报部门" required={isEditable}>
                {isEditable
                  ? (
                    <select className="field-select" value={form.dept} onChange={e => set('dept', e.target.value)}>
                      <option value="">请选择</option>
                      {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )
                  : <input className={inputCls} readOnly value={form.dept || '—'} />}
              </Field>
              <Field label="提报人" required={isEditable}>
                <input className={inputCls} readOnly={!isEditable} value={form.submitter} onChange={e => set('submitter', e.target.value)} placeholder="姓名" />
              </Field>
            </div>
            <Field label="议题说明" required={isEditable}>
              <textarea className="field-area" readOnly={!isEditable} rows={3} value={form.background} onChange={e => set('background', e.target.value)} placeholder="背景、要解决的问题，以及本次上会希望达成什么" />
            </Field>
          </div>
        </>
      )}

      {showExtra && (
        <div className="form-sec">
          <div className="form-sec-title">上会安排 <span>均可不填，提交后办公室可再补</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="汇报人">
              <input className={inputCls} readOnly={!isEditable} value={form.presenter} onChange={e => set('presenter', e.target.value)} placeholder="默认提报人" />
            </Field>
            <Field label="预计时长">
              <select className="field-select" disabled={!isEditable} value={form.estimatedMins} onChange={e => set('estimatedMins', Number(e.target.value))}>
                {[...new Set([10, 15, 20, 30, 45, 60, form.estimatedMins])].sort((a, b) => a - b).map(n => <option key={n} value={n}>{n} 分钟</option>)}
              </select>
            </Field>
            <Field label="优先级">
              <select className="field-select" disabled={!isEditable} value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </Field>
          </div>
          <Field label="决策点">
            {(['dp1', 'dp2', 'dp3'] as const).slice(0, dpShown).map((k, i) => (
              <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: i < dpShown - 1 ? 8 : 0 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: form[k] ? 'var(--primary)' : 'var(--border)', color: form[k] ? '#fff' : 'var(--muted-foreground)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <input className={inputCls} readOnly={!isEditable} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={isEditable ? '本次希望会议拍板的事项' : '—'} />
              </div>
            ))}
            {isEditable && dpShown < 3 && (
              <button type="button" onClick={() => setDpShown(n => n + 1)} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>添加决策点</button>
            )}
          </Field>
          <Field label="汇报材料">
            {isEditable && (
              <>
                <input ref={fileRef} type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx" style={{ display: 'none' }} onChange={handleFileChange} />
                <DropZone
                  title="上传材料（选填）"
                  hint="PDF / PPT / Word / Excel"
                  onClick={() => fileRef.current?.click()}
                />
              </>
            )}
            {files.length === 0 && !isEditable && <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>暂无附件</div>}
            {files.map(f => (
              <div key={f.id} className="file-row">
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', width: 36 }}>{fileIcon(f.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{f.size}</div>
                </div>
                {isEditable
                  ? <button type="button" onClick={() => setFiles(p => p.filter(x => x.id !== f.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>移除</button>
                  : <span style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }}>预览</span>}
              </div>
            ))}
          </Field>
          {isEditable && (
            <Field label="领导预览概要">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: aiSummaryDone ? 8 : 0 }}>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>提交后也可再生成</span>
                <Btn label={aiSummaryLoading ? '生成中…' : aiSummaryDone ? '重新生成' : '生成概要'} variant="secondary" small disabled={aiSummaryLoading || !form.background} onClick={generateSummary} />
              </div>
              {aiSummaryDone && aiSummaryText && (
                <div style={{ fontSize: 13, lineHeight: 1.75, background: '#fff', borderRadius: 6, padding: '10px 12px' }}>{aiSummaryText}</div>
              )}
            </Field>
          )}
          {!isCreate && !isEditable && (
            <Field label="AI 概要">
              <div style={{ fontSize: 13, color: aiSummaryText ? 'var(--foreground)' : 'var(--muted-foreground)', lineHeight: 1.75 }}>{aiSummaryText || '暂无概要'}</div>
            </Field>
          )}
        </div>
      )}

      {!isCreate && (
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>编号 {topic.id}</span>
          <span>提报 {topic.submittedAt}</span>
        </div>
      )}
    </ModalShell>
  )
}

// ─── Topics View ──────────────────────────────────────────────────────────────

function TopicsView() {
  const [topics, setTopics] = useState<Topic[]>(INIT_TOPICS)
  const [filter, setFilter] = useState<TopicStatus | '全部'>('全部')
  const [modal, setModal] = useState<{ topic: Topic | null } | null>(null)
  const [toast, setToast] = useState('')

  const filtered = filter === '全部' ? topics : topics.filter(t => t.status === filter)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const handleSave = (saved: Topic) => {
    setTopics(prev => prev.some(t => t.id === saved.id) ? prev.map(t => t.id === saved.id ? saved : t) : [saved, ...prev])
    showToast(saved.id.startsWith('T') && !INIT_TOPICS.some(t => t.id === saved.id) ? '议题申报成功！办公室统筹人员将安排上会时间。' : '议题已保存更新。')
  }

  const handleLock = (id: string) => {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, status: '锁定中' } : t))
    showToast('议题已锁定，申报人将无法再修改。')
  }

  const FILTERS: (TopicStatus | '全部')[] = ['全部', '待安排', '已安排', '锁定中', '已上会']
  const filterCount = (f: TopicStatus | '全部') => f === '全部' ? topics.length : topics.filter(t => t.status === f).length

  return (
    <div>
      {modal !== undefined && modal !== null && (
        <TopicFormModal
          topic={modal.topic}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onLock={handleLock}
        />
      )}

      <SectionHeader
        title="议题管理"
        subtitle="议题全生命周期管理：申报 → 安排 → 锁定 → 上会"
        action={<Btn label="+ 申报议题" variant="primary" onClick={() => setModal({ topic: null })} />}
      />

      {toast && (
        <div className="toast">{toast}</div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {FILTERS.map(f => {
          const count = filterCount(f)
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: filter === f ? '1.5px solid var(--primary)' : '1px solid var(--border)', background: filter === f ? 'var(--secondary)' : 'var(--card)', color: filter === f ? 'var(--primary)' : 'var(--muted-foreground)' }}>
              {f}
              {count > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: filter === f ? 'var(--primary)' : '#e2e8f0', color: filter === f ? '#fff' : '#64748b', borderRadius: 9, padding: '0 5px' }}>{count}</span>}
            </button>
          )
        })}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted-foreground)' }}>
          共 {filtered.length} 条
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
              {['编号', '议题名称', '提报部门', '提报人', '汇报人', '优先级', '时长', '状态', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>暂无相关议题</td></tr>
            )}
            {filtered.map(t => {
              const canEdit = t.status === '待安排' || t.status === '已安排'
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: 'var(--muted-foreground)' }}>{t.id}</td>
                  <td style={{ padding: '12px 14px', maxWidth: 260 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.background?.slice(0, 60)}{t.background?.length > 60 ? '…' : ''}</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted-foreground)' }}>{t.dept}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>{t.submitter}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted-foreground)' }}>{t.presenter}</td>
                  <td style={{ padding: '12px 14px' }}><Badge label={t.priority} color={priorityColor[t.priority]} /></td>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'JetBrains Mono,monospace', color: 'var(--muted-foreground)' }}>{t.estimatedMins}min</td>
                  <td style={{ padding: '12px 14px' }}><Badge label={t.status} color={topicStatusColor[t.status]} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn label={canEdit ? '编辑' : '查看'} variant="ghost" small onClick={() => setModal({ topic: t })} />
                      {t.status === '已安排' && (
                        <Btn label="锁定" variant="danger" small onClick={() => { handleLock(t.id) }} />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Meeting Live ─────────────────────────────────────────────────────────────

// Historical decision data per topic
const TOPIC_HISTORY: Record<string, { dp: string; quote: string; date: string; meeting: string; note: string }[]> = {
  'T003': [
    { dp: '薪酬体系改革方案审批', quote: '薪酬要与贡献挂钩，让实干者有获得感。', date: '06-12', meeting: '人才发展专题会', note: '会上要求人力资源部结合市场薪酬调研，提出宽带薪酬改革方案，本次承接该方向。' },
    { dp: '绩效联动机制建立', quote: '绩效考核不能只是过场，要真正影响收入分配。', date: '04-08', meeting: '总经理办公会', note: '四月会议已就绩效与薪酬联动做原则性决策，本次进入落地方案审批阶段。' },
  ],
  'T004': [
    { dp: '投资规模上限审批', quote: '战略性投资不怕多，怕的是没有退出路径。', date: '05-20', meeting: '投资委员会专题', note: '本次议题在五月投资委会上已完成尽调汇报，本次为最终审批节点。' },
  ],
}

function MeetingLive() {
  const m = INIT_MEETINGS[0]
  const meetingTopics = m.meetingTopics.sort((a, b) => a.order - b.order).map(mt => INIT_TOPICS.find(t => t.id === mt.topicId)!).filter(Boolean)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [notifyToast, setNotifyToast] = useState('')

  const current = meetingTopics[currentIdx]
  const next = meetingTopics[currentIdx + 1] ?? null

  if (!current) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>暂无议题</div>

  const totalMeetingMins = meetingTopics.reduce((s, t) => s + t.estimatedMins, 0)
  const elapsedMins = meetingTopics.slice(0, currentIdx).reduce((s, t) => s + t.estimatedMins, 0)
  const overallPct = Math.round((elapsedMins / totalMeetingMins) * 100)

  const notifyNext = () => {
    if (!next) return
    setNotifyToast(`已通知下一议题「${next.title}」，汇报人 ${next.presenter} 请做好准备。`)
    setTimeout(() => setNotifyToast(''), 4000)
  }

  const history = TOPIC_HISTORY[current.id] ?? []
  const materials = [
    { name: `${current.title.slice(0, 10)}_报告.pdf`, size: '2.4MB', ext: 'PDF', color: '#1b365d', bg: '#eef2f6' },
    { name: `${current.title.slice(0, 8)}_PPT.pptx`, size: '8.1MB', ext: 'PPT', color: '#8a5a2b', bg: '#f5f0ea' },
  ]

  return (
    <div style={{ margin: '-28px -32px' }}>

      {/* ── Header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        {/* Live badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#faf6ec', border: '1px solid #f4ecd8', borderRadius: 20, padding: '4px 12px 4px 8px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-ring 2s infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#9a7b3a' }}>进行中</span>
        </div>
        {/* Title */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.3 }}>{m.title}</div>
        </div>
        {/* Meta */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 0, alignItems: 'center' }}>
          {[`${m.date}`, m.time, m.location, `主持 ${m.chair}`].map((item, i) => (
            <span key={i} style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '0 14px', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>{item}</span>
          ))}
        </div>
      </div>

      {/* ── Progress strip ── */}
      <div style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)', padding: '7px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)' }}>会议进度</span>
        <div style={{ flex: 1, height: 3, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${overallPct}%`, background: 'var(--primary)', borderRadius: 2, transition: 'width 0.6s ease' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0 }}>
          议题 {currentIdx + 1} / {meetingTopics.length} · {totalMeetingMins} 分钟
        </span>
      </div>

      {/* ── Notify toast ── */}
      {notifyToast && (
        <div className="toast" style={{ marginBottom: 0, borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border)' }}>{notifyToast}</div>
      )}

      {/* ── Body ── */}
      <div className="live-body">

        {/* ─ Left ─ */}
        <div className="live-col">
          <div className="live-card">
            <LiveHead title="议题列表" meta={`${meetingTopics.length} 项`} />
            <div className="live-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {meetingTopics.map((t, i) => {
                  const isCurrent = i === currentIdx
                  const isDone = i < currentIdx
                  return (
                    <div key={t.id} onClick={() => setCurrentIdx(i)}
                      style={{ display: 'flex', gap: 11, padding: '12px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--border)'}`, background: isCurrent ? 'var(--secondary)' : '#fff', transition: 'all 0.15s' }}
                      onMouseOver={e => { if (!isCurrent) e.currentTarget.style.borderColor = 'var(--primary)' }}
                      onMouseOut={e => { if (!isCurrent) e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: isDone ? '#2f5d4a' : isCurrent ? 'var(--primary)' : '#e6e8ec', color: isDone || isCurrent ? '#fff' : '#94a3b8', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? 'var(--primary)' : isDone ? '#94a3b8' : 'var(--foreground)', lineHeight: 1.4, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>汇报人 {t.presenter} · {t.estimatedMins} 分钟</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {next && (
                <button onClick={notifyNext} style={{ width: '100%', marginTop: 12, padding: '9px 0', borderRadius: 7, fontSize: 12, fontWeight: 500, background: 'var(--secondary)', color: 'var(--primary)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  通知下一议题汇报人 {next.presenter}
                </button>
              )}
            </div>
          </div>

          <div className="live-card">
            <LiveHead title="议题附件" meta={`${materials.length} 份`} />
            <div className="live-card-body">
              {materials.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: i < materials.length - 1 ? 6 : 0, cursor: 'pointer' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 7, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: f.color }}>{f.ext}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{f.size}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>预览</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─ Right ─ */}
        <div className="live-col">

            <div className="live-card">
              <LiveHead
                title="AI 总结"
                meta="基于议题材料生成"
                extra={<button style={{ marginLeft: 'auto', padding: '4px 13px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 5, background: '#fff', cursor: 'pointer', color: 'var(--muted-foreground)', fontFamily: 'inherit' }}>复制</button>}
              />
              <div className="live-card-body" style={{ paddingTop: 14 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.9 }}>
                  {current.aiSummary || `本议题「${current.title}」由${current.dept}${current.presenter}汇报，预计${current.estimatedMins}分钟。${current.background?.slice(0, 120) || '请参阅议题材料'}。`}
                </p>
              </div>
            </div>

            <div className="live-card">
              <LiveHead title="决策事项" meta={`来源 ${materials[0].name}`} />
              <div className="live-card-body" style={{ paddingTop: 8 }}>
                {current.decisionPoints.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--muted-foreground)', padding: '8px 0' }}>暂无预设决策事项</div>
                )}
                {current.decisionPoints.map((dp, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderBottom: i < current.decisionPoints.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ fontSize: 14, color: 'var(--foreground)', fontWeight: 500, lineHeight: 1.65, paddingTop: 3 }}>{dp}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="live-card">
              <LiveHead
                title="决议脉络"
                meta="历史决策回溯"
                extra={history.length > 0 ? <span className="live-head-meta" style={{ marginLeft: 'auto' }}>{history.length} 条历史决议</span> : undefined}
              />
              <div className="live-card-body" style={{ paddingTop: 16 }}>

              {history.length === 0 && (
                <div className="empty" style={{ padding: 32 }}>该议题暂无历史决议记录</div>
              )}

              {history.length > 0 && (
                <div style={{ position: 'relative' }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: 11, top: 12, bottom: 12, width: 1, background: '#e2e8f0' }} />

                  {history.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, marginBottom: i < history.length - 1 ? 28 : 0, position: 'relative' }}>
                      {/* Timeline dot */}
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--secondary)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, marginTop: 1 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Decision point label */}
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 8 }}>{h.dp}</div>

                        {/* Quote */}
                        <div style={{ background: 'var(--secondary)', border: '1px solid var(--border)', borderLeft: '3px solid var(--primary)', borderRadius: '0 6px 6px 0', padding: '10px 14px', marginBottom: 10 }}>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--primary)', lineHeight: 1.7, fontStyle: 'italic' }}>"{h.quote}"</p>
                        </div>

                        {/* Meta row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted-foreground)', background: 'var(--muted)', padding: '2px 8px', borderRadius: 4 }}>{h.date}</span>
                          <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>·</span>
                          <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{h.meeting}</span>
                        </div>

                        {/* Context note */}
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.75 }}>{h.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Minutes ──────────────────────────────────────────────────────────────────

interface SupervisionTask {
  id: string
  text: string          // 督办标题
  detail: string        // 详细内容
  assignee: string      // 责任人 / 部门
  follower: string      // 跟进人
  deadline: string
  checked: boolean
}

// ── SupervisionTaskModal ──────────────────────────────────────────────────────
function SupervisionTaskModal({ task, onClose, onSave, onDelete }: {
  task: SupervisionTask | null
  onClose: () => void
  onSave: (t: SupervisionTask) => void
  onDelete?: () => void
}) {
  const blank: SupervisionTask = { id: '', text: '', detail: '', assignee: '', follower: '', deadline: '', checked: true }
  const [form, setForm] = useState<SupervisionTask>(task ?? blank)
  const set = (k: keyof SupervisionTask, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  return (
    <ModalShell
      title={task ? '编辑督办事项' : '新增督办事项'}
      kicker="会议纪要"
      width={560}
      zIndex={1200}
      onClose={onClose}
      footer={
        <ModalFoot left={onDelete ? <Btn label="删除" variant="danger" small onClick={onDelete} /> : undefined}>
          <Btn label="取消" variant="ghost" onClick={onClose} />
          <Btn label={task ? '保存修改' : '确认添加'} variant="primary" disabled={!form.text.trim() || !form.assignee.trim()} onClick={() => { onSave({ ...form, id: form.id || `ST${Date.now()}` }); onClose() }} />
        </ModalFoot>
      }
    >
      <Field label="督办标题" required>
        <input className="field-input" value={form.text} onChange={e => set('text', e.target.value)} placeholder="简明描述督办事项" />
      </Field>
      <Field label="详细内容">
        <textarea className="field-area" rows={4} value={form.detail} onChange={e => set('detail', e.target.value)} placeholder="督办要求、背景、达成标准" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="责任人 / 部门" required>
          <input className="field-input" value={form.assignee} onChange={e => set('assignee', e.target.value)} placeholder="如：张慧敏 / 信息技术部" />
        </Field>
        <Field label="跟进人">
          <input className="field-input" value={form.follower} onChange={e => set('follower', e.target.value)} placeholder="如：王总助" />
        </Field>
      </div>
      <Field label="截止日期">
        <input className="field-input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
      </Field>
    </ModalShell>
  )
}

function MeetingMinutesPanel({ meeting }: { meeting: typeof INIT_MEETINGS[0] }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [minutesFile, setMinutesFile] = useState<{ name: string; size: string } | null>(null)
  const [aiState, setAiState] = useState<'idle' | 'parsing' | 'done'>('idle')
  const [aiSummary, setAiSummary] = useState('')
  const [tasks, setTasks] = useState<SupervisionTask[]>([])
  const [taskModal, setTaskModal] = useState<SupervisionTask | null | 'new'>(undefined as unknown as null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<SupervisionTask | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setMinutesFile({ name: f.name, size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB` })
    setAiState('parsing')
    setConfirmed(false)
    setTimeout(() => {
      setAiSummary(`本次${meeting.title}由${meeting.chair}主持，共${meeting.attendees.length}名人员出席。会议就${meeting.meetingTopics.length}项议题进行审议，形成如下主要决定：一、各项议题所涉事项原则通过，相关责任部门按照会议要求推进落实；二、重点工程项目加快推进节奏，各牵头单位需在规定时间节点前完成阶段性目标；三、下次办公会将对本次督办事项进行集中汇报。`)
      setTasks([
        { id: 'ST1', text: '数字化转型三期项目完成供应商招标文件发布', detail: '按照董事会批复，完成招标文件编制、合规审查并在官网发布，同时在系统完成归档。', assignee: '张慧敏', follower: '王总助', deadline: '2026-09-15', checked: true },
        { id: 'ST2', text: '薪酬改革方案首批核心员工套改完成', detail: '对500名核心骨干按新方案完成薪档套改，完成人员公示，系统数据更新。', assignee: '王芳', follower: '李副总（常务）', deadline: '2026-09-30', checked: true },
        { id: 'ST3', text: '华北区业务整合方案最终版提交', detail: '完成华北区三家子公司整合路线图、风险评估及财务测算，形成最终汇报版本。', assignee: '赵国栋', follower: '张副总（运营）', deadline: '2026-10-31', checked: true },
        { id: 'ST4', text: '四季度新市场开拓预算执行季度汇报', detail: '向总经理办公会汇报四季度预算执行情况、关键市场进展及偏差分析。', assignee: '营销中心', follower: '李副总（常务）', deadline: '2026-12-31', checked: true },
      ])
      setAiState('done')
    }, 2200)
    e.target.value = ''
  }

  const toggleTask = (idx: number) => setTasks(p => p.map((t, i) => i === idx ? { ...t, checked: !t.checked } : t))
  const saveTask = (saved: SupervisionTask) => {
    setTasks(p => p.some(t => t.id === saved.id) ? p.map(t => t.id === saved.id ? saved : t) : [...p, saved])
  }
  const removeTask = (id: string) => setTasks(p => p.filter(t => t.id !== id))

  const handleConfirm = () => {
    setConfirming(true)
    setTimeout(() => { setConfirming(false); setConfirmed(true); showToast(`已确认 ${tasks.filter(t => t.checked).length} 条督办事项，已同步至 TB 项目任务`) }, 1600)
  }

  return (
    <div>
      {/* Task modal */}
      {showTaskModal && (
        <SupervisionTaskModal
          task={editingTask}
          onClose={() => { setShowTaskModal(false); setEditingTask(null) }}
          onSave={saveTask}
          onDelete={editingTask ? () => { removeTask(editingTask.id); setShowTaskModal(false); setEditingTask(null) } : undefined}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      {/* 上传区 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Noto Serif SC',serif", marginBottom: 12 }}>上传会议纪要</div>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={handleFileChange} />
        {!minutesFile ? (
          <DropZone
            title="点击上传会议纪要文件"
            hint="支持 PDF · Word · TXT，上传后 AI 自动解析"
            onClick={() => fileRef.current?.click()}
          />
        ) : (
          <div className="file-row">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', width: 36 }}>FILE</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{minutesFile.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{minutesFile.size}</div>
            </div>
            {aiState === 'parsing' && <div style={{ fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-ring 1s infinite' }} />AI 解析中…</div>}
            {aiState === 'done' && <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>解析完成</span>}
            <button onClick={() => { setMinutesFile(null); setAiState('idle'); setAiSummary(''); setTasks([]); setConfirmed(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: 16 }}>×</button>
          </div>
        )}
      </Card>

      {aiState === 'done' && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>AI 智能摘要</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>基于纪要内容自动提炼</div>
            </div>
            <div style={{ background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 7, padding: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.85 }}>
              {aiSummary}
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Noto Serif SC',serif" }}>督办事项清单</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>AI 自动提取 · 可修改、新增后确认提交至 TB</div>
              </div>
              {!confirmed && <Btn label="+ 新增事项" variant="ghost" small onClick={() => { setEditingTask(null); setShowTaskModal(true) }} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
              {tasks.map((task, idx) => (
                <div key={task.id} style={{ border: `1px solid ${task.checked ? 'var(--border)' : 'var(--border)'}`, borderRadius: 8, background: task.checked ? 'var(--secondary)' : '#fafafa' }}>
                  <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {!confirmed && (
                      <input type="checkbox" checked={task.checked} onChange={() => toggleTask(idx)} style={{ accentColor: 'var(--primary)', width: 15, height: 15, marginTop: 2, flexShrink: 0 }} />
                    )}
                    {confirmed && <span style={{ fontSize: 14, color: '#059669', flexShrink: 0, marginTop: 1 }}>✓</span>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: task.checked ? 'var(--foreground)' : '#9ca3af', textDecoration: task.checked ? 'none' : 'line-through' }}>{task.text}</div>
                      {task.detail && (
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, lineHeight: 1.65 }}>{task.detail}</div>
                      )}
                      <div className="meta" style={{ marginTop: 6 }}>
                        <span>责任 {task.assignee}</span>
                        {task.follower && <span>跟进 {task.follower}</span>}
                        {task.deadline && <span>截止 {task.deadline}</span>}
                      </div>
                    </div>
                    {!confirmed && (
                      <button onClick={() => { setEditingTask(task); setShowTaskModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, padding: '2px 6px', flexShrink: 0 }}>编辑</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!confirmed ? (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  已选 <strong style={{ color: 'var(--primary)' }}>{tasks.filter(t => t.checked).length}</strong> / {tasks.length} 条事项提交至 TB
                </div>
                <Btn label={confirming ? '提交中…' : '确认并同步至 TB'} variant="primary" disabled={confirming || tasks.filter(t => t.checked).length === 0} onClick={handleConfirm} />
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--primary)' }}>
                <span>已同步 {tasks.filter(t => t.checked).length} 条督办事项至 TB 项目任务</span>
                <button onClick={() => setConfirmed(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 12, color: 'var(--muted-foreground)', cursor: 'pointer' }}>重新编辑</button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function MinutesView() {
  const meetings = INIT_MEETINGS.filter(m => m.status === '已结束')
  const [selectedId, setSelectedId] = useState<string>(meetings[0]?.id ?? '')
  const selected = meetings.find(m => m.id === selectedId) ?? meetings[0]

  return (
    <div>
      <SectionHeader title="会议纪要" subtitle="仅已结束的会议可上传纪要 · AI 自动提取摘要和督办事项 · 确认后同步至 TB" />

      {meetings.length === 0 && (
        <div className="empty">
          暂无已结束的会议
          <div style={{ marginTop: 6, fontSize: 12 }}>会议结束后将在此处显示，可上传纪要文件</div>
        </div>
      )}

      {meetings.length > 0 && (
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left: meeting list */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.04em' }}>已结束会议</div>
          {meetings.map(m => (
            <div key={m.id} onClick={() => setSelectedId(m.id)} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedId === m.id ? 'var(--secondary)' : 'transparent', borderLeft: selectedId === m.id ? '3px solid var(--primary)' : '3px solid transparent', transition: 'all 0.15s' }}>
              <div style={{ fontSize: 13, fontWeight: selectedId === m.id ? 600 : 400, color: selectedId === m.id ? 'var(--primary)' : 'var(--foreground)', marginBottom: 3, lineHeight: 1.4 }}>{m.title}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{m.date} · {m.location.slice(0, 10)}</div>
              <div style={{ marginTop: 5 }}><Badge label={m.status} color="bg-emerald-50 text-emerald-700 border border-emerald-200" /></div>
            </div>
          ))}
        </div>

        {/* Right: minutes panel */}
        <div>
          {selected && (
            <>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Noto Serif SC',serif" }}>{selected.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{selected.date} {selected.time}–{selected.endTime} · {selected.location} · 主持：{selected.chair}</div>
                </div>
                <Badge label={selected.status} color={selected.status === '已结束' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'} />
              </div>
              <MeetingMinutesPanel key={selected.id} meeting={selected} />
            </>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

// ─── Actions ──────────────────────────────────────────────────────────────────

function ActionDetailModal({ item, onClose }: { item: ActionItem; onClose: () => void }) {
  const meetingTitle = MEETING_TITLE_MAP[item.meetingId] ?? item.meetingId
  return (
    <ModalShell
      title={item.title}
      kicker={item.id}
      extra={<Badge label={item.status} color={actionStatusColor[item.status]} />}
      width={620}
      onClose={onClose}
      footer={
        item.status === '待确认关闭'
          ? (
            <ModalFoot left={<span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>负责人已提交关闭申请</span>}>
              <Btn label="驳回" variant="danger" onClick={onClose} />
              <Btn label="确认关闭" variant="primary" onClick={onClose} />
            </ModalFoot>
          )
          : <ModalFoot><Btn label="关闭" variant="ghost" onClick={onClose} /></ModalFoot>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          ['来源会议', meetingTitle],
          ['交办时间', item.assignedAt],
          ['责任人', `${item.assignee}（${item.dept}）`],
          ['跟进人', item.follower],
          ['截止日期', item.deadline],
        ].map(([k, v]) => (
          <div key={k} style={{ background: 'var(--muted)', borderRadius: 6, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>
      <Field label="交办事项说明">
        <div style={{ fontSize: 13, lineHeight: 1.8, background: 'var(--muted)', borderRadius: 6, padding: '10px 12px' }}>{item.description}</div>
      </Field>
      <Field label="阶段性进展">
        {item.monthlyReports.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>暂无进展报告</div>
        )}
        {item.monthlyReports.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{r.month}</div>
              <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.7 }}>{r.content}</div>
            </div>
          </div>
        ))}
      </Field>
      {item.status === '已关闭' && (
        <div style={{ fontSize: 13, color: '#2f5d4a' }}>任务已完成关闭</div>
      )}
    </ModalShell>
  )
}

function NewActionModal({ onClose }: { onClose: () => void }) {
  const blank = { title: '', meetingId: 'M2026-07', description: '', assignee: '', follower: '', dept: '', assignedAt: '2026-08-27', deadline: '' }
  const [form, setForm] = useState(blank)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <ModalShell
      title="新建交办事项"
      kicker="会后处理"
      width={580}
      onClose={onClose}
      footer={
        <ModalFoot>
          <Btn label="取消" variant="ghost" onClick={onClose} />
          <Btn label="创建交办事项" variant="primary" onClick={onClose} />
        </ModalFoot>
      }
    >
      <Field label="来源会议">
        <select className="field-select" value={form.meetingId} onChange={e => set('meetingId', e.target.value)}>
          {Object.entries(MEETING_TITLE_MAP).map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
      </Field>
      <Field label="交办事项标题" required>
        <input className="field-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="请输入事项标题" />
      </Field>
      <Field label="事项说明">
        <textarea className="field-area" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="简述交办背景与目标" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="责任人">
          <input className="field-input" value={form.assignee} onChange={e => set('assignee', e.target.value)} placeholder="姓名" />
        </Field>
        <Field label="责任部门">
          <input className="field-input" value={form.dept} onChange={e => set('dept', e.target.value)} placeholder="部门名称" />
        </Field>
        <Field label="跟进人">
          <input className="field-input" value={form.follower} onChange={e => set('follower', e.target.value)} placeholder="姓名" />
        </Field>
        <Field label="交办时间">
          <input className="field-input" type="date" value={form.assignedAt} onChange={e => set('assignedAt', e.target.value)} />
        </Field>
        <Field label="截止日期">
          <input className="field-input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
        </Field>
      </div>
    </ModalShell>
  )
}

function ActionsView() {
  const [detailItem, setDetailItem] = useState<ActionItem | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [filterStatus, setFilterStatus] = useState<ActionStatus | '全部'>('全部')
  const [filterMeeting, setFilterMeeting] = useState<string>('全部')
  const [keyword, setKeyword] = useState('')

  const uniqueMeetings = [...new Set(ACTIONS.map(a => a.meetingId))]
  const q = keyword.trim()

  const filtered = ACTIONS.filter(a => {
    if (filterStatus !== '全部' && a.status !== filterStatus) return false
    if (filterMeeting !== '全部' && a.meetingId !== filterMeeting) return false
    if (q && !`${a.title}${a.assignee}${a.dept}${a.follower}`.includes(q)) return false
    return true
  })

  const stats = [
    { label: '跟进中', value: ACTIONS.filter(a => a.status === '跟进中').length, color: 'var(--primary)' },
    { label: '待确认关闭', value: ACTIONS.filter(a => a.status === '待确认关闭').length, color: '#d97706' },
    { label: '已关闭', value: ACTIONS.filter(a => a.status === '已关闭').length, color: '#059669' },
    { label: '逾期风险', value: ACTIONS.filter(a => a.status === '跟进中' && a.deadline < '2026-08-27').length || 1, color: '#dc2626' },
  ]

  return (
    <div>
      {detailItem && <ActionDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
      {showNew && <NewActionModal onClose={() => setShowNew(false)} />}

      <SectionHeader title="交办事项管理" subtitle="会议决议转化的交办事项，实现闭环跟踪与阶段性汇报" action={<Btn label="+ 新建事项" variant="primary" onClick={() => setShowNew(true)} />} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-field">
          <label>关键词</label>
          <input className="filter-control" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="事项名称 / 责任人 / 部门" />
        </div>
        <div className="filter-field">
          <label>状态</label>
          <select className="filter-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value as ActionStatus | '全部')}>
            <option value="全部">全部状态</option>
            <option value="跟进中">跟进中</option>
            <option value="待确认关闭">待确认关闭</option>
            <option value="已关闭">已关闭</option>
          </select>
        </div>
        <div className="filter-field">
          <label>来源会议</label>
          <select className="filter-control" value={filterMeeting} onChange={e => setFilterMeeting(e.target.value)}>
            <option value="全部">全部会议</option>
            {uniqueMeetings.map(id => <option key={id} value={id}>{MEETING_TITLE_MAP[id] ?? id}</option>)}
          </select>
        </div>
        <div className="filter-count">共 {filtered.length} 项</div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div className="empty">暂无符合条件的交办事项</div>
        )}
        {filtered.map(a => (
          <div key={a.id} onClick={() => setDetailItem(a)}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', marginBottom: 7, lineHeight: 1.4 }}>{a.title}</div>
                <div className="meta">
                  <span>责任 {a.assignee}（{a.dept}）</span>
                  <span>跟进 {a.follower}</span>
                  <span>交办 {a.assignedAt}</span>
                  <span style={{ color: a.deadline < '2026-08-27' && a.status === '跟进中' ? '#8b3a3a' : 'inherit', fontWeight: a.deadline < '2026-08-27' && a.status === '跟进中' ? 600 : 400 }}>截止 {a.deadline}</span>
                </div>
              </div>
              <div style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
                <Badge label={a.status} color={actionStatusColor[a.status]} />
              </div>
            </div>
            {a.status === '待确认关闭' && (
              <div className="warn-bar" style={{ marginTop: 10, justifyContent: 'space-between' }} onClick={e => e.stopPropagation()}>
                <span>负责人已提交关闭申请，待统筹人确认</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn label="确认关闭" variant="primary" small onClick={() => {}} />
                  <Btn label="驳回" variant="danger" small onClick={() => {}} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── App Shell ────────────────────────────────────────────────────────────────

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconGrid({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.4"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.4"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.4"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke={c} strokeWidth="1.4"/>
    </svg>
  )
}
function IconClipboard({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="3.5" width="11" height="11" rx="1.5" stroke={c} strokeWidth="1.4"/>
      <path d="M5.5 3.5V3a2.5 2.5 0 0 1 5 0v.5" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5 7.5h6M5 10h4" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function IconCalendar({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3" width="13" height="11.5" rx="1.5" stroke={c} strokeWidth="1.4"/>
      <path d="M1.5 7h13" stroke={c} strokeWidth="1.4"/>
      <path d="M5 1.5V4M11 1.5V4" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="5.5" cy="10" r="0.9" fill={c}/>
      <circle cx="8" cy="10" r="0.9" fill={c}/>
      <circle cx="10.5" cy="10" r="0.9" fill={c}/>
    </svg>
  )
}
function IconPlay({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke={c} strokeWidth="1.4"/>
      <path d="M6.5 5.5l4 2.5-4 2.5V5.5z" fill={c}/>
    </svg>
  )
}
function IconDoc({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1h5l3.5 3.5V13.5A1.5 1.5 0 0 1 11.5 15h-7A1.5 1.5 0 0 1 3 13.5V2.5z" stroke={c} strokeWidth="1.4"/>
      <path d="M9.5 1v3.5H13" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.5 8h5M5.5 10.5h3.5" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function IconPin({ c }: { c: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M9.5 2L14 6.5l-3.5 1L8 10 6 14l-1.5-4L1 8.5l3.5-2L5.5 3 9.5 2z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M2 14l3-3" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function IconBell({ c }: { c: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2.5a5.5 5.5 0 0 0-5.5 5.5v3L2 13h14l-1.5-2V8A5.5 5.5 0 0 0 9 2.5z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M7.5 13a1.5 1.5 0 0 0 3 0" stroke={c} strokeWidth="1.4"/>
    </svg>
  )
}
function IconLogo({ c }: { c: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="10" width="16" height="2" rx="1" fill={c}/>
      <rect x="3" y="12" width="12" height="2" rx="1" fill={c} opacity="0.7"/>
      <path d="M9 2L2 8h14L9 2z" fill={c}/>
      <rect x="6" y="6" width="2" height="4" rx="0.5" fill={c} opacity="0.5"/>
      <rect x="10" y="6" width="2" height="4" rx="0.5" fill={c} opacity="0.5"/>
    </svg>
  )
}

type NavItem = { id: NavSection; label: string; icon: (c: string) => React.ReactNode; group: string }

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: '管理驾驶舱', icon: c => <IconGrid c={c} />,      group: '概览' },
  { id: 'topics',       label: '议题管理',   icon: c => <IconClipboard c={c} />, group: '会前准备' },
  { id: 'meetings',     label: '会议管理',   icon: c => <IconCalendar c={c} />,  group: '会前准备' },
  { id: 'meeting-live', label: '会中管控',   icon: c => <IconPlay c={c} />,      group: '会议进行' },
  { id: 'minutes',      label: '会议纪要',   icon: c => <IconDoc c={c} />,       group: '会后处理' },
  { id: 'actions',      label: '交办事项',   icon: c => <IconPin c={c} />,       group: '会后处理' },
]

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('meetings')
  const groups = [...new Set(NAV_ITEMS.map(i => i.group))]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <aside style={{ width: 'var(--sidebar-width)', background: 'var(--sidebar-bg)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid var(--sidebar-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconLogo c="#12203a" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f4f1ea', lineHeight: 1.25, letterSpacing: '0.04em', fontFamily: "'Noto Serif SC', serif" }}>总经理办公会</div>
              <div style={{ fontSize: 11, color: 'rgba(244,241,234,0.45)', marginTop: 3 }}>全流程闭环管理</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '14px 10px' }}>
          {groups.map(g => (
            <div key={g} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(244,241,234,0.38)', letterSpacing: '0.12em', padding: '0 10px', marginBottom: 6 }}>{g}</div>
              {NAV_ITEMS.filter(i => i.group === g).map(item => {
                const active = activeSection === item.id
                const iconColor = active ? 'var(--accent)' : 'rgba(244,241,234,0.5)'
                return (
                  <div
                    key={item.id}
                    className="nav-item"
                    onClick={() => setActiveSection(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                      background: active ? 'rgba(196,163,90,0.14)' : 'transparent',
                      color: active ? '#f4f1ea' : 'rgba(244,241,234,0.72)',
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                    onMouseOver={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      {item.icon(iconColor)}
                    </span>
                    {item.label}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(196,163,90,0.2)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>办</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#f4f1ea', fontWeight: 500, lineHeight: 1.3 }}>集团办公室</div>
            <div style={{ fontSize: 11, color: 'rgba(244,241,234,0.42)', marginTop: 1 }}>统筹管理员</div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 'var(--header-height)', background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--muted-foreground)' }}>集团总部</span>
            <span style={{ color: '#d5d8de' }}>/</span>
            <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{NAV_ITEMS.find(i => i.id === activeSection)?.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', background: 'var(--secondary)', borderRadius: 6, fontSize: 12, color: 'var(--primary)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4"/><path d="M6 3.5v3l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              下次会议 <strong>2026-08-15</strong>（距今 5 天）
            </div>
            <div style={{ position: 'relative', cursor: 'pointer', width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
              <IconBell c="#6b7380" />
              <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, background: '#8b3a3a', borderRadius: '50%' }} />
            </div>
          </div>
        </header>
        <main style={{ flex: 1, padding: '28px 32px' }}>
          {activeSection === 'dashboard' && <Dashboard onNav={setActiveSection} />}
          {activeSection === 'topics' && <TopicsView />}
          {activeSection === 'meetings' && <MeetingsView topics={INIT_TOPICS} onNav={setActiveSection} />}
          {activeSection === 'meeting-live' && <MeetingLive />}
          {activeSection === 'minutes' && <MinutesView />}
          {activeSection === 'actions' && <ActionsView />}
        </main>
      </div>
    </div>
  )
}
