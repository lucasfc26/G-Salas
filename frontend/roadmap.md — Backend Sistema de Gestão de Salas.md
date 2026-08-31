# Roadmap — Backend do Sistema de Gestão de Aluguel de Salas

## 0. Objetivo do projeto

Transformar o MVP visual em uma plataforma SaaS real (E-Salas) para gestão de aluguel de salas e consultórios compartilhados, voltada a psicólogos, dentistas, nutricionistas, fisioterapeutas e outros profissionais de atendimento.

O sistema deverá possuir:

- Autenticação segura.
- Clientes/profissionais.
- Administradores.
- Salas.
- Agenda.
- Reservas.
- Créditos/horas.
- Contratos.
- Upload de documentos.
- Compressão de imagens.
- Financeiro.
- Comprovantes de pagamento.
- Notificações.
- Histórico/auditoria.
- Dashboard.
- Relatórios.
- Controle de permissões.
- Proteções contra abuso.
- Alta performance.
- Arquitetura preparada para crescimento.

O backend deve ser desenvolvido com foco em:

**Segurança + Performance + Escalabilidade + Manutenibilidade + Observabilidade.**

---

# 1. Stack principal

Utilizar:

### Backend

- Node.js
- NestJS
- TypeScript
- REST API

### Banco de dados

- PostgreSQL
- Prisma ORM

### Performance

- Redis
- Cache
- Rate limiting
- Paginação
- Lazy loading
- Queries otimizadas
- Índices PostgreSQL

### Arquivos

- Object Storage
- Upload por streaming
- Compressão de imagens
- Redimensionamento
- WebP/AVIF quando apropriado

### Infraestrutura

- Docker
- Docker Compose
- NGINX
- Cloudflare
- HTTPS
- Linux

### Segurança

- JWT
- Refresh Token
- Argon2 ou bcrypt
- RBAC
- ValidationPipe
- Helmet
- CORS configurado
- Rate limiting
- Proteção contra brute force
- Sanitização
- Logs
- Auditoria

---

# 2. Arquitetura geral

Utilizar arquitetura modular do NestJS.

Estrutura inicial:

```text
src/
├── app.module.ts
│
├── config/
│   ├── configuration.ts
│   ├── database.config.ts
│   ├── auth.config.ts
│   ├── storage.config.ts
│   └── validation.ts
│
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   ├── pipes/
│   ├── middleware/
│   ├── constants/
│   ├── enums/
│   └── utils/
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── auth/
├── users/
├── professionals/
├── rooms/
├── schedules/
├── reservations/
├── credits/
├── contracts/
├── financial/
├── payments/
├── notifications/
├── uploads/
├── audit/
├── dashboard/
└── health/
```

Cada módulo deverá possuir, quando necessário:

```text
module/
├── module.ts
├── controller.ts
├── service.ts
├── dto/
├── entities/
├── guards/
└── interfaces/
```

Evitar criar um "mega service".

Cada domínio deverá possuir responsabilidade própria.

---

# 3. Configuração inicial

Criar o projeto:

```bash
nest new backend
```

Configurar:

- TypeScript strict mode.
- ESLint.
- Prettier.
- Husky.
- lint-staged.
- Environment variables.
- ConfigModule global.

Nunca colocar:

- Senhas.
- JWT secrets.
- Credenciais.
- Chaves de storage.
- Tokens.

diretamente no código.

Utilizar:

```text
.env
.env.development
.env.production
```

e secrets no ambiente de produção.

---

# 4. PostgreSQL + Prisma

Instalar e configurar Prisma.

Criar:

```text
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

Configurar PostgreSQL.

O Prisma deverá ser utilizado como camada principal de acesso ao banco.

Evitar:

- SQL espalhado pelo código.
- Queries duplicadas.
- Acesso ao Prisma diretamente pelos controllers.

Fluxo:

```text
Controller
    ↓
Service
    ↓
Repository/Data Access
    ↓
Prisma
    ↓
PostgreSQL
```

---

# 5. Modelagem inicial do banco

Criar as entidades principais.

## User

Campos:

- id
- name
- email
- passwordHash
- phone
- role
- status
- avatarUrl
- createdAt
- updatedAt
- lastLoginAt

Roles:

```text
ADMIN
CLIENT
```

---

## ProfessionalProfile

Relacionamento 1:1 com User.

Campos:

- profession
- registrationNumber
- specialties
- serviceType
- averagePatients
- averageMonthlyHours
- averageSessionDuration
- bio
- birthDate
- address

---

## Address

Campos:

- zipCode
- street
- number
- complement
- neighborhood
- city
- state
- country

---

## Room

Campos:

- id
- name
- description
- capacity
- status
- hourlyPrice
- imageUrl
- createdAt
- updatedAt

Status:

```text
AVAILABLE
MAINTENANCE
INACTIVE
```

---

# 6. Sistema de planos/créditos

Criar:

## Contract

Relacionar contrato com cliente.

Campos:

- id
- userId
- planId
- startDate
- endDate
- monthlyHours
- cancellationLimit
- status
- documentUrl
- createdAt
- updatedAt

---

## CreditWallet

Representar o saldo de horas do cliente.

Campos:

- id
- userId
- contractId
- balance
- totalGranted
- totalUsed
- updatedAt

---

## CreditTransaction

Nunca simplesmente alterar o saldo sem registrar histórico.

Criar ledger:

```text
CreditTransaction
```

Campos:

- id
- walletId
- type
- amount
- referenceType
- referenceId
- description
- createdAt

Tipos:

```text
CREDIT
DEBIT
REFUND
ADJUSTMENT
EXPIRATION
```

Isso permitirá auditar exatamente como o saldo foi alterado.

---

# 7. Agenda

Criar:

```text
Schedule
Availability
BlockedPeriod
```

O administrador poderá definir:

- Horários disponíveis.
- Horários bloqueados.
- Dias de funcionamento.
- Exceções.
- Manutenções.

Não armazenar milhares de slots pré-gerados no banco.

Preferir armazenar regras e períodos e calcular disponibilidade quando necessário.

---

# 8. Reservas

Criar:

```text
Reservation
```

Campos:

- id
- userId
- roomId
- startAt
- endAt
- duration
- status
- creditTransactionId
- cancellationReason
- cancelledAt
- createdAt
- updatedAt

Status:

```text
PENDING
CONFIRMED
COMPLETED
CANCELLED
NO_SHOW
REJECTED
```

---

# 9. Regra crítica de reservas

Nunca permitir duas reservas para a mesma sala e horário.

A criação da reserva deve utilizar:

- Transaction do PostgreSQL.
- Verificação de conflito.
- Lock/constraint apropriado.
- Operação atômica.

Fluxo:

```text
Cliente solicita horário
        ↓
Validar autenticação
        ↓
Validar contrato
        ↓
Validar créditos
        ↓
Validar horário
        ↓
Validar conflito
        ↓
Criar reserva
        ↓
Debitar crédito
        ↓
Commit
```

Se qualquer etapa falhar:

**Rollback completo.**

Nunca debitar crédito e criar reserva em operações independentes.

---

# 10. Cancelamento e remarcação

Criar serviço específico:

```text
ReservationPolicyService
```

Ele deverá verificar:

- Quantas horas faltam para o atendimento.
- Limite de cancelamentos.
- Quantidade de cancelamentos anteriores.
- Se o crédito deve ser devolvido.
- Se o cliente pode remarcar.

Exemplo:

```text
> 24h
→ cancela
→ devolve crédito

< 24h
→ cancela
→ pode consumir crédito
→ registra ocorrência
```

As regras devem ser configuráveis por contrato.

Não deixar regras críticas hardcoded em controllers.

---

# 11. Sistema financeiro

Criar módulo:

```text
financial/
```

Entidades:

```text
Invoice
Payment
PaymentReceipt
```

## Invoice

Representa uma cobrança.

Campos:

- id
- userId
- contractId
- amount
- dueDate
- referenceMonth
- status
- description
- createdAt
- updatedAt

Status:

```text
PENDING
PAID
OVERDUE
CANCELLED
UNDER_REVIEW
```

---

# 12. Comprovante de pagamento

Criar:

```text
PaymentReceipt
```

Campos:

- id
- paymentId
- fileUrl
- originalFileName
- mimeType
- fileSize
- uploadedAt
- reviewedAt
- reviewedBy
- rejectionReason
- status

Status:

```text
PENDING_REVIEW
APPROVED
REJECTED
```

Fluxo:

```text
Cliente
 ↓
Seleciona pendência
 ↓
Upload
 ↓
Backend valida arquivo
 ↓
Storage
 ↓
Cria PaymentReceipt
 ↓
Status = PENDING_REVIEW
 ↓
Notifica administrador
```

---

# 13. Upload seguro de arquivos

Nunca confiar apenas na extensão do arquivo.

Validar:

- MIME type.
- Magic bytes.
- Tamanho.
- Extensão.
- Conteúdo.

Definir limites:

```text
Imagem de perfil: 5 MB
Comprovante: 10 MB
Contrato: 20 MB
```

Nunca armazenar arquivos sensíveis diretamente no PostgreSQL.

Utilizar Object Storage.

Exemplo de arquitetura:

```text
Frontend
   ↓
Backend
   ↓
Storage
```

Para arquivos grandes, considerar:

```text
Frontend
   ↓
Signed URL
   ↓
Object Storage
```

O backend continua responsável pela autorização.

---

# 14. Compressor de imagens

Criar um `ImageProcessingService`.

Utilizar uma biblioteca robusta como:

```text
Sharp
```

Pipeline:

```text
Upload
 ↓
Validação
 ↓
Sharp
 ↓
Resize
 ↓
Compressão
 ↓
WebP/AVIF
 ↓
Storage
```

Gerar versões:

```text
avatar-sm
avatar-md
avatar-lg
```

Nunca entregar uma imagem de 5 MB para uma interface que precisa de uma thumbnail de 100 KB.

---

# 15. Lazy Loading

O backend deverá ser preparado para lazy loading no frontend.

Não retornar imagens grandes em endpoints de listagem.

Exemplo:

```json
{
  "avatar": {
    "thumbnail": "...",
    "medium": "...",
    "original": "..."
  }
}
```

Listagens devem retornar apenas os dados necessários.

Evitar:

```text
GET /clients
```

retornando contratos + reservas + pagamentos + histórico completo.

Preferir:

```text
GET /clients
GET /clients/:id
GET /clients/:id/contracts
GET /clients/:id/reservations
GET /clients/:id/payments
```

---

# 16. Paginação

Toda listagem potencialmente grande deverá possuir paginação.

Preferir cursor pagination em listas que podem crescer muito.

Exemplo:

```text
GET /reservations?limit=20&cursor=...
```

Para telas administrativas onde paginação tradicional seja suficiente:

```text
?page=1&limit=20
```

Nunca retornar milhares de registros de uma vez.

---

# 17. Prisma — otimização

Nunca utilizar:

```typescript
include: {
  everything: true
}
```

Selecionar somente os campos necessários.

Preferir:

```typescript
select: {
  id: true,
  name: true,
  email: true
}
```

Criar índices para campos utilizados frequentemente:

- email
- userId
- roomId
- startAt
- endAt
- status
- dueDate
- contractId

Analisar queries lentas periodicamente.

---

# 18. Redis

Utilizar Redis para:

- Cache.
- Rate limiting.
- Sessões/refresh token quando apropriado.
- Locks distribuídos quando necessários.
- Dados temporários.
- Jobs/filas.

Não utilizar Redis como banco principal.

PostgreSQL continua sendo a fonte de verdade.

---

# 19. Cache

Criar cache para dados de leitura frequente e baixa volatilidade.

Exemplos:

```text
rooms
room details
availability configuration
dashboard summaries
```

Evitar cache agressivo de:

- saldo de créditos;
- pagamentos;
- reservas;
- contratos.

Dados financeiros e de reserva devem priorizar consistência.

Utilizar TTL e invalidação explícita quando necessário.

---

# 20. Filas e processamento assíncrono

Criar arquitetura preparada para jobs.

Utilizar Redis + BullMQ.

Jobs:

```text
ProcessImageJob
SendNotificationJob
ContractExpirationJob
PaymentReminderJob
GenerateReportJob
```

Exemplo:

```text
Upload imagem
     ↓
API responde rapidamente
     ↓
Job entra na fila
     ↓
Worker processa imagem
     ↓
Storage
```

Isso evita bloquear requisições HTTP com processamento pesado.

---

# 21. Notificações

Criar módulo:

```text
notifications/
```

Entidade:

```text
Notification
```

Tipos:

```text
CONTRACT_EXPIRING
CONTRACT_EXPIRED
PAYMENT_PENDING
PAYMENT_APPROVED
PAYMENT_REJECTED
RESERVATION_CONFIRMED
RESERVATION_CANCELLED
LOW_CREDITS
```

Canais inicialmente:

- In-app.

Arquitetura preparada para:

- E-mail.
- WhatsApp.
- Push.

---

# 22. Alertas automáticos

Criar jobs periódicos.

Exemplo:

```text
Todos os dias às 08:00
        ↓
Buscar contratos vencendo
        ↓
7 dias
15 dias
30 dias
        ↓
Criar notificações
```

Financeiro:

```text
Buscar cobranças próximas do vencimento
        ↓
Criar alerta
```

Vencidas:

```text
dueDate < now
AND status = PENDING
        ↓
OVERDUE
```

---

# 23. Autenticação

Implementar:

```text
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
GET /auth/me
```

Senha:

- Hash com Argon2id preferencialmente.
- Nunca armazenar senha em texto puro.

JWT:

```text
Access Token
+
Refresh Token
```

Access token com duração curta.

Refresh token com rotação e revogação.

---

# 24. Segurança de autenticação

Implementar:

- Rate limit no login.
- Proteção contra brute force.
- Bloqueio temporário após tentativas excessivas.
- Logs de login.
- Revogação de sessões.
- Validação de e-mail.
- Recuperação segura de senha.

Nunca revelar:

```text
"Este e-mail não existe"
```

no fluxo de recuperação de senha.

Utilizar resposta genérica.

---

# 25. RBAC

Criar:

```text
RolesGuard
```

Roles:

```text
ADMIN
CLIENT
```

Posteriormente permitir:

```text
SUPER_ADMIN
MANAGER
FINANCIAL
STAFF
```

Exemplo:

```text
@Roles(Role.ADMIN)
```

Nunca confiar no role enviado pelo frontend.

O backend sempre deverá validar a permissão.

---

# 26. Validação de entrada

Utilizar:

```text
class-validator
class-transformer
ValidationPipe
```

Configurar:

```text
whitelist: true
forbidNonWhitelisted: true
transform: true
```

Todo DTO deverá validar:

- Tipo.
- Tamanho.
- Formato.
- Range.
- Enum.

Nunca confiar em dados vindos do frontend.

---

# 27. Segurança HTTP

Utilizar:

```text
Helmet
```

Configurar:

- CSP.
- HSTS.
- X-Content-Type-Options.
- Frame protection.

Configurar CORS permitindo somente os domínios autorizados.

Nunca usar:

```text
origin: "*"
```

em produção quando houver autenticação/cookies.

---

# 28. Rate limiting

Aplicar limites diferentes por endpoint.

Exemplo:

```text
Login:
5 tentativas / minuto

API normal:
100 requests / minuto

Upload:
20 requests / hora

Password reset:
3 requests / hora
```

Os valores devem ser configuráveis via environment.

---

# 29. Proteção contra abuso

Implementar:

- Rate limiting.
- Request size limits.
- Upload limits.
- Timeout.
- Validação rigorosa.
- Sanitização.
- Controle de paginação.
- Proteção contra enumeração de usuários.
- Proteção contra brute force.

---

# 30. LGPD

Como haverá dados pessoais e documentos, tratar o sistema considerando LGPD desde o início.

Evitar logs contendo:

- Senhas.
- Tokens.
- Documentos.
- Dados financeiros desnecessários.

Criar mecanismos para:

- Consentimento quando necessário.
- Exportação de dados.
- Exclusão/anonymização quando aplicável.
- Auditoria.
- Controle de acesso.

---

# 31. Auditoria

Criar:

```text
AuditLog
```

Registrar ações importantes:

```text
LOGIN
LOGOUT
CREATE_RESERVATION
CANCEL_RESERVATION
CREATE_CONTRACT
UPDATE_CONTRACT
UPLOAD_RECEIPT
APPROVE_PAYMENT
REJECT_PAYMENT
CREDIT_ADJUSTMENT
USER_UPDATE
```

Campos:

```text
userId
action
entity
entityId
metadata
ip
userAgent
createdAt
```

Nunca registrar informações secretas.

---

# 32. Integridade financeira

Operações financeiras devem ser transacionais.

Exemplo:

```text
Aprovar pagamento
        ↓
Transaction
        ├── Payment = PAID
        ├── Receipt = APPROVED
        ├── Invoice = PAID
        └── AuditLog
```

Se alguma etapa falhar:

```text
ROLLBACK
```

Não permitir que o sistema fique em estado inconsistente.

---

# 33. Integridade dos créditos

Créditos também deverão utilizar transactions.

Exemplo:

```text
Criar reserva
      ↓
BEGIN TRANSACTION
      ↓
Validar saldo
      ↓
Criar Reservation
      ↓
Criar CreditTransaction
      ↓
Atualizar CreditWallet
      ↓
COMMIT
```

Nunca simplesmente:

```text
wallet.balance -= 1
```

sem histórico.

---

# 34. Idempotência

Endpoints críticos deverão suportar idempotência.

Principalmente:

```text
POST /reservations
POST /payments
POST /receipts
```

Criar mecanismo:

```text
Idempotency-Key
```

Isso evita duplicação causada por:

- Double click.
- Retry do frontend.
- Timeout.
- Requisição repetida.

---

# 35. API versioning

Utilizar:

```text
/api/v1
```

Exemplo:

```text
/api/v1/auth
/api/v1/users
/api/v1/rooms
/api/v1/reservations
/api/v1/contracts
/api/v1/payments
```

Isso permitirá criar:

```text
/api/v2
```

futuramente sem quebrar o frontend antigo.

---

# 36. Padronização de respostas

Criar padrão:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Para erros:

```json
{
  "success": false,
  "error": {
    "code": "RESERVATION_CONFLICT",
    "message": "O horário selecionado não está mais disponível."
  }
}
```

Não retornar stack traces para o cliente.

---

# 37. Tratamento global de erros

Criar:

```text
GlobalExceptionFilter
```

Mapear:

- Validation errors.
- Authentication errors.
- Authorization errors.
- Database errors.
- Business errors.

Criar erros de domínio:

```text
InsufficientCreditsException
ReservationConflictException
ContractExpiredException
PaymentAlreadyProcessedException
```

---

# 38. Observabilidade

Implementar:

- Logs estruturados.
- Request ID.
- Error tracking.
- Health checks.
- Métricas.

Endpoints:

```text
GET /health
GET /health/database
GET /health/redis
```

Nunca expor informações sensíveis no health endpoint público.

---

# 39. Logging

Utilizar logger estruturado.

Cada request deve possuir:

```text
requestId
method
path
statusCode
duration
userId
```

Nunca registrar:

```text
password
JWT
refreshToken
document contents
```

---

# 40. Performance

O backend deverá seguir:

### Database

- Índices.
- Queries pequenas.
- Select específico.
- Paginação.
- Connection pooling.
- Transactions apenas quando necessárias.

### API

- Compression.
- Cache.
- Response minimizada.
- DTOs.
- Paginação.

### Arquivos

- Compressão.
- CDN.
- Lazy loading.
- Thumbnails.
- Object Storage.

### Processamento pesado

- BullMQ.
- Workers.

---

# 41. NGINX

Utilizar NGINX como reverse proxy:

```text
Internet
   ↓
Cloudflare
   ↓
NGINX
   ↓
NestJS
   ↓
PostgreSQL / Redis
```

Responsabilidades:

- HTTPS.
- Reverse proxy.
- Headers.
- Compression.
- Rate limiting complementar.
- Cache de assets quando aplicável.

---

# 42. Cloudflare

Utilizar Cloudflare para:

- DNS.
- HTTPS.
- CDN.
- DDoS protection.
- WAF.
- Rate limiting.
- Cache de arquivos públicos.

Nunca expor diretamente o servidor de aplicação quando isso puder ser evitado.

---

# 43. Docker

Criar:

```text
Dockerfile
docker-compose.yml
docker-compose.dev.yml
docker-compose.prod.yml
```

Serviços:

```text
api
postgres
redis
nginx
worker
```

Não executar tudo dentro do mesmo container.

---

# 44. Ambientes

Separar:

```text
development
staging
production
```

Cada ambiente deve possuir:

- Banco separado.
- Redis separado.
- Secrets separados.
- Storage separado.

Nunca utilizar banco de produção localmente.

---

# 45. Migrations

Nunca alterar schema de produção manualmente.

Fluxo:

```text
Alterar Prisma schema
        ↓
prisma migrate dev
        ↓
Testar
        ↓
Commit migration
        ↓
CI/CD
        ↓
prisma migrate deploy
```

Nunca utilizar:

```text
prisma db push
```

como estratégia de deploy de produção.

---

# 46. Seed

Criar seed para desenvolvimento.

Criar:

- Admin.
- Clientes.
- Salas.
- Contratos.
- Reservas.
- Pagamentos.
- Notificações.

Nunca utilizar senhas reais.

---

# 47. Testes unitários

Testar principalmente:

```text
AuthService
ReservationService
CreditService
ContractService
PaymentService
CancellationPolicyService
```

Casos importantes:

### Créditos

- Saldo suficiente.
- Saldo insuficiente.
- Crédito devolvido.
- Crédito não devolvido.

### Reserva

- Horário disponível.
- Horário ocupado.
- Contrato vencido.
- Usuário sem crédito.

### Pagamento

- Aprovação.
- Rejeição.
- Duplicação.
- Comprovante inválido.

---

# 48. Testes E2E

Criar testes:

```text
login
refresh token
create reservation
cancel reservation
upload receipt
approve payment
reject payment
contract expiration
```

O fluxo completo deve ser testado.

---

# 49. Testes de concorrência

Testar especificamente:

```text
Dois usuários tentando reservar
a mesma sala no mesmo horário.
```

O sistema deve garantir:

```text
Usuário A → sucesso
Usuário B → conflito
```

Nunca:

```text
Usuário A → sucesso
Usuário B → sucesso
```

---

# 50. CI/CD

Criar pipeline:

```text
Push
 ↓
Install
 ↓
Lint
 ↓
Typecheck
 ↓
Unit Tests
 ↓
E2E
 ↓
Build
 ↓
Docker Build
 ↓
Deploy
```

Não permitir deploy se os testes críticos falharem.

---

# 51. Documentação da API

Utilizar Swagger/OpenAPI.

Disponibilizar:

```text
/api/docs
```

Documentar:

- Endpoints.
- DTOs.
- Responses.
- Erros.
- Autenticação.
- Paginação.

---

# 52. Estrutura final dos módulos

Ao final:

```text
src/

auth/
users/
professionals/

rooms/
schedules/
reservations/
credits/

contracts/

financial/
payments/

uploads/
notifications/

dashboard/
audit/

health/

common/
config/
prisma/
```

---

# 53. Ordem de implementação

Não desenvolver tudo simultaneamente.

Seguir esta ordem:

## FASE 1 — Fundação

- Criar NestJS.
- TypeScript strict.
- ESLint.
- Prettier.
- ConfigModule.
- Prisma.
- PostgreSQL.
- Docker.
- Environment.

---

## FASE 2 — Banco

Criar:

- User.
- ProfessionalProfile.
- Address.
- Room.
- Contract.
- CreditWallet.
- CreditTransaction.
- Schedule.
- Reservation.
- Invoice.
- Payment.
- PaymentReceipt.
- Notification.
- AuditLog.

Criar migrations e índices.

---

## FASE 3 — Segurança

Implementar:

- Login.
- JWT.
- Refresh Token.
- Hash de senha.
- RBAC.
- Guards.
- ValidationPipe.
- Helmet.
- CORS.
- Rate limiting.
- Brute force protection.

---

## FASE 4 — Usuários

Implementar:

- Perfil.
- Avatar.
- Dados profissionais.
- Endereço.
- Atualização de dados.

---

## FASE 5 — Salas

Implementar:

- CRUD de salas.
- Imagens.
- Status.
- Características.
- Disponibilidade.

---

## FASE 6 — Agenda

Implementar:

- Disponibilidade.
- Bloqueios.
- Horários.
- Calendário.
- Consulta de disponibilidade.

---

## FASE 7 — Créditos

Implementar:

- Wallet.
- Ledger.
- Débito.
- Crédito.
- Refund.
- Histórico.

Toda alteração deve gerar `CreditTransaction`.

---

## FASE 8 — Reservas

Implementar:

- Criar reserva.
- Confirmar.
- Cancelar.
- Remarcar.
- Histórico.
- Política de cancelamento.
- Proteção contra conflito.

Utilizar transactions.

---

## FASE 9 — Contratos

Implementar:

- Upload.
- Vigência.
- Status.
- Renovação.
- Expiração.
- Alertas.

---

## FASE 10 — Financeiro

Implementar:

- Cobranças.
- Pendências.
- Pagamentos.
- Histórico.
- Status.
- Vencimentos.

---

## FASE 11 — Comprovantes

Implementar:

- Upload.
- Validação.
- Compressão quando aplicável.
- Storage.
- Aprovação.
- Rejeição.
- Motivo da rejeição.

---

## FASE 12 — Notificações

Implementar:

- Notificações internas.
- Alertas de contrato.
- Alertas financeiros.
- Alertas de reserva.
- Alertas de créditos.

---

## FASE 13 — Redis + Jobs

Implementar:

- Cache.
- Rate limiting distribuído.
- BullMQ.
- Jobs de notificações.
- Jobs de contratos.
- Jobs financeiros.
- Processamento de imagens.

---

## FASE 14 — Dashboard

Criar endpoints específicos para:

```text
GET /dashboard/client
GET /dashboard/admin
```

Evitar montar dashboard realizando dezenas de requests independentes.

Criar queries agregadas otimizadas.

---

## FASE 15 — Auditoria

Adicionar logs de:

- Login.
- Reservas.
- Cancelamentos.
- Contratos.
- Créditos.
- Pagamentos.
- Usuários.

---

## FASE 16 — Performance

Realizar:

- Query profiling.
- Índices.
- Cache.
- Pagination.
- Select optimization.
- Redis.
- Compression.
- CDN.
- Image optimization.
- Lazy loading.

---

## FASE 17 — Segurança final

Executar checklist:

- [ ] JWT seguro
- [ ] Refresh token rotation
- [ ] Rate limit
- [ ] Brute force protection
- [ ] RBAC
- [ ] ValidationPipe
- [ ] Helmet
- [ ] CORS
- [ ] Upload validation
- [ ] MIME validation
- [ ] File size limits
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF strategy
- [ ] Secrets protegidos
- [ ] Logs sem informações sensíveis
- [ ] Audit log
- [ ] HTTPS
- [ ] Cloudflare
- [ ] Backup do PostgreSQL

---

# 54. Performance target

O sistema deverá ser desenvolvido visando:

```text
API:
< 200ms
```

para operações simples em condições normais.

Queries:

```text
Preferencialmente < 100ms
```

Endpoints críticos:

```text
Login
Agenda
Disponibilidade
Reserva
Dashboard
```

devem ser monitorados individualmente.

Não otimizar prematuramente apenas por números teóricos.

Medir primeiro e otimizar com base em métricas reais.

---

# 55. Regra arquitetural mais importante

O frontend nunca deve possuir lógica de negócio crítica.

O frontend pode mostrar:

```text
"Você possui 18 horas."
```

Mas o backend deve decidir:

```text
O usuário realmente possui 18 horas?
```

O frontend pode mostrar:

```text
"Horário disponível."
```

Mas o backend deve validar novamente:

```text
O horário ainda está disponível?
```

O frontend pode mostrar:

```text
"Contrato ativo."
```

Mas o backend deve validar:

```text
O contrato está ativo e permite essa operação?
```

Toda regra importante deve ser validada no backend.

---

# 56. Fonte da verdade

Definir:

```text
PostgreSQL = Source of Truth
Redis = Cache / Temporary State
Object Storage = Files
NestJS = Business Logic
Frontend = Presentation
```

Nunca depender de informações armazenadas apenas no frontend.

---

# 57. Resultado esperado

Ao concluir o roadmap, o sistema deverá possuir uma arquitetura semelhante a:

```text
                    CLOUDFLARE
                         │
                         ▼
                       NGINX
                         │
                         ▼
                 ┌───────────────┐
                 │    NestJS     │
                 │     API       │
                 └───────┬───────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     PostgreSQL        Redis         Storage
          │              │              │
          │              │              │
          ▼              ▼              ▼
      Dados         Cache/Jobs       Arquivos
          │
          ▼
     Business Logic
          │
    ┌─────┴───────────────────────────────┐
    │                                     │
    ▼                                     ▼
 Reservas                              Financeiro
    │                                     │
    ▼                                     ▼
 Créditos                              Pagamentos
    │                                     │
    ▼                                     ▼
 Contratos                             Comprovantes
```

O resultado final deve ser um backend modular, seguro, observável e preparado para crescimento, evitando que o MVP evolua para um monólito desorganizado.

A prioridade deve ser:

**1. Integridade dos dados**

**2. Segurança**

**3. Consistência das reservas e créditos**

**4. Performance**

**5. Escalabilidade**

**6. Experiência fluida no frontend**

**7. Facilidade de manutenção**