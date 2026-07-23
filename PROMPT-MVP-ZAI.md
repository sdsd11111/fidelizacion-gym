# Brief de construcción — MVP SaaS de Fidelización para Gimnasios

> Instrucción para el agente de desarrollo (ZAi). Este documento es la especificación técnica ejecutable, derivada del documento de negocio `00-FUNDAMENTOS-PROYECTO-GIMNASIO.md`. Si algo en este brief es ambiguo o falta un dato, **pregunta antes de asumir** — no inventes reglas de negocio que no estén aquí escritas.

---

## 1. Objetivo del MVP

Construir el backend y panel funcional de un sistema de fidelización para un gimnasio con unidad de retail (tienda de ropa), mismo dueño, ambos con RUC distintos. El sistema debe funcionar para este cliente real hoy, pero la arquitectura debe ser multi-tenant desde el primer commit, porque ya existe compromiso comercial de vender a futuros gimnasios con configuraciones distintas.

**No es un ejercicio de arquitectura especulativa — es un MVP de producción para un cliente que ya pagó.** Prioriza que funcione correctamente para este tenant sobre construir herramientas de administración multi-cliente (eso es Fase 2, fuera de este MVP).

---

## 2. Stack técnico (fijo, no opcional)

- **Next.js** (App Router), igual que el proyecto hermano BarberOS.
- **Prisma + PostgreSQL** como capa de datos.
- **Autenticación:** JWT vía `jose`, cookie de sesión, validado en Server Components mediante un DAL (Data Access Layer) — mismo patrón que `src/lib/dal.ts` de BarberOS.
- **WhatsApp:** vía Evolution API (mismo proveedor que BarberOS) para todo el canal del cliente final — sin app, sin login para el usuario final.
- **Middleware de sesión:** convención Next.js reciente, archivo `src/proxy.ts` (confirmar versión de Next.js instalada antes de asumir el nombre del archivo).

---

## 3. Regla no negociable: aislamiento multi-tenant desde el día uno

Toda tabla del schema de Prisma debe incluir `tenantId` (`String`, `@db` indexado, `NOT NULL`), sin excepción. Ninguna query de Prisma puede ejecutarse sin filtrar por `tenantId` obtenido de la sesión del servidor — nunca confiar en un `tenantId` enviado desde el cliente/navegador.

Esta regla se implementa ahora, no se pospone. (Contexto: en el proyecto hermano BarberOS, el campo `planStatus` existió en el schema por semanas sin middleware que lo aplicara — esa deuda técnica no se repite aquí.)

---

## 4. Modelo de datos — jerarquía mínima requerida

```
Tenant (dueño del negocio, el "cliente" del SaaS)
 ├─ BusinessUnit (GYM | RETAIL | SPA) — activable/desactivable por configuración
 │    └─ Branch (sucursal) — una o más, activable/desactivable con doble autenticación
 ├─ Wallet — UNA sola por Tenant (no por sucursal, no por unidad de negocio)
 │    └─ WalletTransaction (ledger) — origen, monto, fecha de generación, fecha de vencimiento, fecha/lugar de canje
 ├─ Customer (cliente final) — a nivel Tenant, no a nivel sucursal
 ├─ Referral — referidor, referido, businessUnit/branch donde se activó, fecha de registro, fecha de vencimiento (12 meses desde registro), estado (pendiente/activado/vencido)
 ├─ Staff — roles: OWNER (nivel Tenant), MANAGER (nivel Branch), TRAINER/COACH (nivel BusinessUnit)
 └─ Evaluation — trainerId, customerId (si disponible), rating (1-5), comentario opcional, metadatos (timestamp, branchId, qrSlugId)
```

**Modularidad:** activar o desactivar una `BusinessUnit` o `Branch` debe ser una operación de configuración (fila en base de datos / flag), nunca un cambio de código. La forma técnica de lograrlo (feature flags, tablas de configuración, u otro patrón) queda a tu criterio como desarrollador — lo único no negociable es que un mismo despliegue de código sirva a tenants con configuraciones distintas sin bifurcar el proyecto.

---

## 5. Los cuatro flujos funcionales del MVP

### 5.1 Referidos + Wallet

- Cualquier persona (cliente o no) puede referir a otra vía WhatsApp.
- La comisión se dispara **una sola vez**, cuando el referido completa su primera transacción pagada (inscripción o compra) — no es recurrente.
- % de comisión: **configurable por el dueño** en el panel, sin valor por defecto impuesto por el sistema.
- Ventana: 12 meses desde el registro del referido (no desde su activación). Si vence sin activarse, el crédito nunca se genera.
- Notificación obligatoria al referidor cuando su crédito esté por vencer sin activarse (ver 5.4).
- El crédito se acredita al Wallet único del Tenant.
- **Canje: sin tope — el saldo puede cubrir hasta el 100% de una compra o mensualidad**, siempre que el saldo disponible alcance.

### 5.2 Evaluación de entrenadores por QR

- Flujo activado exclusivamente por QR físico dentro del gimnasio — **nunca integrado al flujo de pago/caja.**
- El QR codifica un slug resuelto en el servidor (`tenantId` + `branchId` + tipo de flujo), nunca datos confiados desde el cliente.
- Flujo: escanear → elegir entrenador (lista de `TRAINER` activos en esa sucursal/unidad) → calificar 1-5 estrellas → comentario opcional.
- La calificación **solo es visible para el rol OWNER**, nunca para el propio entrenador ni en ranking comparativo.
- Cada evaluación registra metadatos completos (timestamp, branchId, qrSlugId) para poder cotejarse manualmente contra cámaras de seguridad en caso de una calificación sospechosa o potencialmente difamatoria. No se requiere verificación automática ni biométrica en este MVP.
- El panel del OWNER debe presentar el dato con interpretación, no solo el promedio crudo (ej. "la calificación de Carlos bajó en las últimas semanas" en vez de solo un número).

### 5.3 Configuración de unidades de negocio y sucursales

- Panel de configuración para el OWNER: activar/desactivar `BusinessUnit` y `Branch`.
- **Eliminar una unidad de negocio o sucursal requiere doble autenticación** (ej. confirmación por contraseña + código enviado por WhatsApp, o el mecanismo que definas técnicamente — el requisito de negocio es doble factor, no un solo clic).
- Eliminar una sucursal nunca debe afectar el Wallet (vive a nivel Tenant, es independiente).

### 5.4 Notificaciones (WhatsApp)

Tres disparadores distintos, con tono y copy diferenciado — no reutilizar el mismo mensaje para los tres:

1. **Inactividad de uso** ("te extrañamos") — cliente con membresía activa sin asistencia reciente (definir umbral de días en configuración, no hardcodeado).
2. **Vencimiento contractual de membresía** — la fecha de la membresía se acerca o venció, independiente de asistencia. Tono de cobranza/informativo, no de "te extrañamos".
3. **Vencimiento de crédito de referido sin activar** — dirigido al referidor, no al referido, cuando su ventana de 12 meses esté por cerrarse sin que el referido se haya activado.

Implementar como cron jobs (mismo patrón que `/api/cron/reactivation` de BarberOS), no como procesos manuales.

---

## 6. Explícitamente fuera de alcance de este MVP

No construir en esta fase:

- Panel de administración multi-cliente (gestión de varios tenants desde una sola vista de super-admin) — solo si el tiempo lo permite como estructura base, pero no es requisito de este MVP.
- Reconocimiento facial o verificación biométrica de evaluaciones.
- Simulador financiero de impacto de % de referidos.
- Cualquier mecanismo de "cada N pagos, uno gratis" — fue descartado, no se construye.
- Motor de recomendaciones o agentes de IA.

Si durante el desarrollo aparece la tentación de construir algo de esta lista "porque ya que estamos", detente y pregunta antes de avanzar.

---

## 7. Antes de empezar a escribir código

Confirma con el equipo (César):

- Credenciales/instancia de Evolution API a usar (¿misma cuenta que BarberOS, o una nueva independiente para este proyecto?).
- Proveedor de hosting/base de datos (¿mismo Supabase/Vercel que BarberOS, o infraestructura separada?).
- Nombre técnico provisional del proyecto/repositorio (el nombre de marca comercial sigue pendiente, pero el repo necesita un nombre interno).

No asumas ninguno de estos tres puntos — pregunta explícitamente antes de generar configuración de entorno o desplegar nada.
