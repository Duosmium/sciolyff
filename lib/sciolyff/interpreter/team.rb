# frozen_string_literal: true

require 'sciolyff/interpreter/model'

module SciolyFF
  # Models an instance of a Science Olympiad team at a specific tournament
  class Interpreter::Team < Interpreter::Model
    def link_to_other_models(interpreter)
      super
      @placings  = interpreter.placings .select { |p| p.team == self }
      @penalties = interpreter.penalties.select { |p| p.team == self }
      @placings_by_event =
        @placings.group_by(&:event).transform_values!(&:first)
    end

    attr_reader :placings, :penalties, :track

    def school
      @rep[:school]
    end

    def school_abbreviation
      @rep[:'school abbreviation']
    end

    def suffix
      @rep[:suffix]
    end

    def track_name
      @rep[:track]
    end

    def exhibition?
      @rep[:exhibition] || false
    end

    def disqualified?
      @rep[:disqualified] || false
    end

    def number
      @rep[:number]
    end

    def city
      @rep[:city]
    end

    def state
      @rep[:state]
    end

    def placing_for(event)
      @placings_by_event[event]
    end

    def rank
      @tournament.teams.find_index(self) + 1
    end

    def track_rank
      @track.teams.sort_by(&:track_points).find_index(self) + 1
    end

    def points
      @points ||= placings.sum(&:points) + penalties.sum(&:points)
    end

    def track_points
      @track_points ||= placings.sum(&:track_points) + penalties.sum(&:points)
    end

    def earned_bid?
      school_rank = @tournament.teams_eligible_for_bids.find_index(self)
      !school_rank.nil? && school_rank < @tournament.bids
    end

    def worst_placings_to_be_dropped
      return [] if @tournament.worst_placings_dropped.zero?

      placings
        .select(&:initially_considered_for_team_points?)
        .sort_by(&:isolated_points)
        .reverse
        .take(@tournament.worst_placings_dropped)
    end

    def trial_event_points
      placings.select { |p| p.event.trial? }.sum(&:isolated_points)
    end

    def medal_counts
      (1..(@tournament.teams.count + 2)).map do |medal_points|
        placings.select(&:considered_for_team_points?)
                .count { |p| p.points == medal_points }
      end
    end

    def trial_event_medal_counts
      (1..(@tournament.teams.count + 2)).map do |medal_points|
        placings.select { |p| p.event.trial? }
                .count { |p| p.isolated_points == medal_points }
      end
    end

    def add_track(new_track)
      @track = new_track
    end
  end
end
