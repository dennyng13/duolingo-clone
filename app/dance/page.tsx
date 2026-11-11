import { DanceLoader } from "@/components/dance/dance-loader";

type DancePageProps = {
  searchParams: Promise<{ room?: string | string[] }>;
};

const DancePage = async ({ searchParams }: DancePageProps) => {
  const { room } = await searchParams;
  const initialRoom = typeof room === "string" ? room : undefined;

  return <DanceLoader initialRoom={initialRoom} />;
};

export default DancePage;
