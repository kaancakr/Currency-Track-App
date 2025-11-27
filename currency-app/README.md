This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Configure environment variables

Copy the example file and adjust the backend URL if needed:

```bash
cp env.example .env.local
```

`NEXT_PUBLIC_API_BASE_URL` must point to the Flask API root (default `http://localhost:5000/api`).

### 2. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard. The page streams live rates queried from the backend every 15 seconds and refreshes immediately when you add/remove pairs.

### Available scripts

- `npm run dev` – start Next.js in development
- `npm run build` – create a production build
- `npm start` – run the production build
- `npm run lint` – run ESLint
