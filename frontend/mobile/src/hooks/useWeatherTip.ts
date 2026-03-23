import { useQuery } from '@tanstack/react-query';

export interface WeatherTip {
  show: boolean;
  message: string;
  bgColor: string;
  textColor: string;
}

const NO_TIP: WeatherTip = { show: false, message: '', bgColor: '', textColor: '' };

// Weather condition → civic tip mapping
function buildTip(condition: string, tempC: number): WeatherTip {
  const lower = condition.toLowerCase();

  if (lower.includes('thunder') || lower.includes('storm')) {
    return {
      show: true,
      message: 'Thunderstorm alert: Report fallen trees, waterlogging, or damaged infrastructure',
      bgColor: '#EFF6FF',
      textColor: '#1E40AF',
    };
  }

  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
    return {
      show: true,
      message: 'Rain alert: Drainage issues likely \u2014 report blockages early',
      bgColor: '#EFF6FF',
      textColor: '#1E40AF',
    };
  }

  if (tempC > 40) {
    return {
      show: true,
      message: `Extreme heat (${Math.round(tempC)}\u00B0C): Water supply stress expected \u2014 report disruptions`,
      bgColor: '#FEF2F2',
      textColor: '#991B1B',
    };
  }

  if (tempC > 35) {
    return {
      show: true,
      message: `High temperature (${Math.round(tempC)}\u00B0C): Stay hydrated, report water supply issues`,
      bgColor: '#FFFBEB',
      textColor: '#92400E',
    };
  }

  if (lower.includes('haze') || lower.includes('fog') || lower.includes('mist') || lower.includes('smoke')) {
    return {
      show: true,
      message: 'Poor air quality / visibility \u2014 report visible pollution sources',
      bgColor: '#F5F3FF',
      textColor: '#5B21B6',
    };
  }

  return NO_TIP;
}

export function useWeatherTip(lat?: number, lng?: number) {
  return useQuery({
    queryKey: ['weather-tip', lat, lng],
    queryFn: async (): Promise<WeatherTip> => {
      try {
        // wttr.in — free, no API key needed
        const res = await fetch(`https://wttr.in/${lat},${lng}?format=j1`, {
          headers: { 'User-Agent': 'Civitro/1.0' },
        });
        if (!res.ok) return NO_TIP;
        const data = await res.json();

        const current = data?.current_condition?.[0];
        if (!current) return NO_TIP;

        const condition = current.weatherDesc?.[0]?.value || '';
        const tempC = parseFloat(current.temp_C || '0');

        return buildTip(condition, tempC);
      } catch {
        return NO_TIP;
      }
    },
    enabled: !!lat && !!lng,
    staleTime: 30 * 60_000, // 30 minutes — weather doesn't change fast
    retry: false,
  });
}
