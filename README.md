# YaPilas

Web app de prevención inmediata contra estafas digitales y confirmación de cobros para adultos mayores, bodegueros y jóvenes en Perú. Entrega **un estado, una señal concreta y una sola acción segura en menos de 10 segundos**.

> Todos los ejemplos y notificaciones están rotulados como **Datos de demostración** y **Simulación de lectura de notificaciones**. La app no guarda ni registra consultas ni pide claves, códigos SMS o tarjetas.

---

## 1. Variables de entorno

Copia `.env.example` a `.env` y coloca tu clave de IA **solo en el servidor**:

```bash
cp .env.example .env
```

Variables soportadas en `.env`:

| Variable | Uso |
| :--- | :--- |
| `DEEPSEEK_API_KEY` | Clave de DeepSeek API (opción principal) |
| `DEEPSEEK_MODEL` | Modelo DeepSeek (por defecto `deepseek-chat`) |
| `DEEPSEEK_BASE_URL` | Endpoint DeepSeek (por defecto `https://api.deepseek.com`) |
| `OPENAI_API_KEY` | Alternativa opcional: clave de OpenAI o proveedor compatible |
| `GEMINI_API_KEY` | Alternativa opcional: clave de Google Gemini API |
| `PORT` | Puerto local (por defecto `3000`) |

> Si no se configura ninguna clave o el modelo falla, el verificador muestra **«Análisis no disponible»** junto con una acción segura propia del perfil. Nunca inventa resultados.

---

## 2. Cómo ejecutar

Con Node.js 18+ (probado en Node 22):

```bash
npm install
npm start
```

Abre en tu navegador:
- **App principal:** `http://localhost:3000`
- **Verificador con IA:** `http://localhost:3000/verificador`
- **Cobro de Luis:** `http://localhost:3000/cobro`
- **Simulador de pagos:** `http://localhost:3000/simulador`

---

## 3. Cómo abrir el simulador de pagos

1. En una pestaña (o en la pantalla proyectada), abre **`http://localhost:3000/cobro`** y toca **«Activar sonido de confirmación»**.
2. En otra pestaña o en otro celular en la misma red, abre **`http://localhost:3000/simulador`** (también hay un botón directo «Abrir Simulador ↗» dentro de la vista de Luis).
3. Prueba **«Mostrar comprobante falso (S/ 12,50)»** (verás que la pantalla de Luis sigue en *Esperando pago*), luego prueba monto/ID incorrecto (*Revisa el abono en tu billetera*) y finalmente **«Confirmar pago simulado»** (*Pago confirmado* + voz única + notificación en el teléfono simulado).

---

## 4. Guion de demo en vivo (50 segundos)

- **0–10 s (Inicio + Modo demo):** Muestra **«¿Qué recibiste?»** y el teléfono simulado a la derecha. Explica: *actúa antes de pagar, analiza el contenido (no el número) y no guarda tus mensajes.*
- **10–23 s (Carmen — 68 años):** En el teléfono simulado, toca la notificación de **Carmen** (*«Hola abuela, cambié de número… S/ 200 urgente»*). Pulsa **«Analizar mensaje»** → aparece **Alto riesgo**, la señal concreta y una sola acción segura. Pulsa **«Escuchar resultado»** para oír la voz del dispositivo.
- **23–33 s (Jhon — 22 años):** Cambia a **«Oferta de trabajo»**, carga el ejemplo de S/ 80 por capacitación y pulsa **«Analizar oferta de trabajo»** → acción inmediata de verificación.
- **33–50 s (Luis — 41 años, bodeguero):** Abre **«Pago en mi negocio»** (`S/ 12,50` + ID único) y activa el sonido. En la otra pestaña (`/simulador`), muestra primero el **Comprobante falso** (Luis sigue en *Esperando pago*). Luego pulsa **«Confirmar pago simulado»**: Luis pasa automáticamente a **Pago confirmado**, suena una sola vez *«Pago confirmado. Doce soles con cincuenta»* y aparece la notificación en el teléfono simulado.

---

## 5. Fuentes documentales de evidencia (Perú)

- **S1. INEI — «Victimización en el Perú 2025»** (PDF): https://www.inei.gob.pe/media/MenuRecursivo/publicaciones_digitales/Est/Lib2076/libro.pdf
- **S2. INEI — Boletín «Semestre móvil: febrero–julio 2025»** (PDF): https://www1.inei.gob.pe/media/MenuRecursivo/boletines/informe-tecnico-estadisticas-de-seguridad-ciudadana_feb-jul25.pdf
- **S3. Ministerio Público — Fiscalías Especializadas en Ciberdelincuencia** (PDF, 13,470 delitos registrados entre enero y octubre de 2025 según el extracto): https://portal.mpfn.gob.pe/pedmp/index.php/downloader/informe_content/695d2b903fc61
- **S4. SBS — Cartilla «Cuidado con las estafas financieras digitales»** (PDF): https://www.sbs.gob.pe/portals/3/educacion-financiera-pdf/Cartilla-estafas-financieras-digitales.pdf
- **S5. SBS — «Fraudes digitales y telefónicos»** (web): https://www.sbs.gob.pe/usuarios/aprende-con-la-sbs/fraudes-digitales-y-telefonicos