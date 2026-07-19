import { timed } from "@/lib/perf";
import { loadHomeData, HOME_HEADLINE_TYPE } from "@/lib/home";
import { loadDailyChallenge } from "@/lib/dailyChallenge";
import { HomeGreeting } from "@/components/home/HomeGreeting";
import { LatestAnalysisCard } from "@/components/home/LatestAnalysisCard";
import { HomeStatsRow } from "@/components/home/HomeStatsRow";
import { NewAnalysisCta } from "@/components/home/NewAnalysisCta";
import { DailyChallengeLauncher } from "@/components/dailyChallenge/DailyChallengeLauncher";

export default async function HomePage() {
  const [homeData, challengeItems] = await Promise.all([
    timed("home:data", loadHomeData),
    timed("home:daily-challenge", loadDailyChallenge),
  ]);
  const { firstName, avatarUrl, latest, totalCount, average } = homeData;

  return (
    <div className="screen-body pad-tab" style={{ gap: 18 }}>
      <HomeGreeting firstName={firstName} avatarUrl={avatarUrl} />
      <LatestAnalysisCard latest={latest} analysisType={HOME_HEADLINE_TYPE} />
      <HomeStatsRow average={average} totalCount={totalCount} />
      <NewAnalysisCta />
      <DailyChallengeLauncher items={challengeItems} />
    </div>
  );
}
