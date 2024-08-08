import { ScheduleRepository } from '../repository/schedule.repository'
import { Day, Show } from '../types/components'
import { ShowDto } from '../types/components.dto'

export class ScheduleService {
  private scheduleRepository: ScheduleRepository

  constructor() {
    this.scheduleRepository = new ScheduleRepository()
  }

  public async getSchedule(): Promise<Day[]> {
    const dtos = await this.scheduleRepository.getFullSchedule()
    const dayMap = new Map<number, ShowDto[]>()

    dtos.forEach(dto => {
      dayMap.set(dto.numberOfTheWeek, [...(dayMap.get(dto.numberOfTheWeek) ?? []), dto])
    })

    return Array.from(dayMap.keys())
      .sort()
      .map(n => ({
        numberOfTheWeek: n,
        shows: dayMap
          .get(n)!
          .sort(ScheduleService.compareTimes)
          .map(dto => ScheduleService.transformShowDtoToModel(dto)),
      }))
  }

  private static transformShowDtoToModel(dto: ShowDto): Show {
    return {
      name: dto.name,
      artist: dto.name,
      time: `${ScheduleService.formatInteger(dto.hour)}:${ScheduleService.formatInteger(dto.minute)}`,
      online: dto.online,
      podcastLink: dto.podcastUrl,
      albumArt: dto.thumbnailUrl ? [{ size: '600x600', downloadUrl: dto.thumbnailUrl }] : [],
    }
  }

  private static compareTimes(a: ShowDto, b: ShowDto): number {
    if (a.hour !== b.hour) {
      return a.hour - b.hour
    }

    return a.minute - b.minute
  }

  private static formatInteger(num: number): string {
    if (num < 10) {
      return `0${num.toString()}`
    }

    return num.toString()
  }
}
