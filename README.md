# NexaCore Frontend

Aplicación web de gestión empresarial construida con React, Vite, Tailwind CSS y Supabase. Incluye módulos de Finanzas, Operaciones, CRM y Planificación.

## Tecnologías

- **React** 18 + **Vite** 5
- **Tailwind CSS** 3
- **Supabase** (autenticación y base de datos)
- **Recharts** (gráficos)
- **jsPDF** (generación de PDFs)
- **Lucide React** (íconos)

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- npm v9 o superior
- Cuenta en [Supabase](https://supabase.com/) con un proyecto creado

---

## Configuración local

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd NexaCore_FrontEnd
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar el archivo de ejemplo y completar con los valores reales:

```bash
cp .env.example .env
```

Editar `.env` con las credenciales del proyecto de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
VITE_API_URL=http://localhost:3001
```

> Las variables deben comenzar con `VITE_` para ser accesibles en el cliente.
> Nunca subas el archivo `.env` al repositorio.

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo en el puerto 5173 |
| `npm run build` | Genera el build de producción en la carpeta `dist/` |
| `npm run preview` | Sirve el build de producción localmente para revisión |

---

## Despliegue en Cloudflare Pages

### Opción A — Desde la interfaz de Cloudflare (recomendado)

1. Ir a [Cloudflare Pages](https://pages.cloudflare.com/) e iniciar sesión.
2. Hacer clic en **Create a project** → **Connect to Git**.
3. Seleccionar el repositorio de GitHub/GitLab del proyecto.
4. Configurar los ajustes de build:

   | Campo | Valor |
   |-------|-------|
   | Framework preset | `Vite` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Node.js version | `18` |

5. En la sección **Environment variables**, agregar las variables del archivo `.env`:

   | Variable | Valor |
   |----------|-------|
   | `VITE_SUPABASE_URL` | URL de tu proyecto en Supabase |
   | `VITE_SUPABASE_ANON_KEY` | Anon key de tu proyecto en Supabase |
   | `VITE_API_URL` | URL de la API de backend en producción |

6. Hacer clic en **Save and Deploy**.

---

### Opción B — Desde la CLI de Wrangler

#### Instalar Wrangler

```bash
npm install -g wrangler
```

#### Autenticarse con Cloudflare

```bash
wrangler login
```

#### Generar el build de producción

```bash
npm run build
```

#### Publicar en Cloudflare Pages

```bash
wrangler pages deploy dist --project-name=nexacore-frontend
```

> La primera vez que ejecutes este comando, Wrangler creará el proyecto automáticamente en tu cuenta de Cloudflare.

#### Despliegues posteriores

```bash
npm run build && wrangler pages deploy dist --project-name=nexacore-frontend
```

---

### Configuración de rutas (SPA)

El archivo `public/_redirects` ya está incluido en el proyecto para garantizar que el enrutamiento del lado del cliente funcione correctamente en Cloudflare Pages:

```
/* /index.html 200
```

Este archivo se copia automáticamente a `dist/` durante el build.

---

## Estructura del proyecto

```
src/
├── components/       # Componentes de UI (Login, Dashboard, Layout, etc.)
├── lib/              # Servicios y utilidades (Supabase, API, auth)
├── modules/          # Módulos por dominio (finance, crm, operations, planification)
├── utils/            # Validadores y helpers
├── App.jsx           # Componente raíz con lógica de rutas
├── main.jsx          # Punto de entrada de React
└── index.css         # Estilos globales
```

---

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase | Sí |
| `VITE_API_URL` | URL base del backend | Sí |
