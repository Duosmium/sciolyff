require 'sciolyff/interpreter'
require 'json'

Dir["../duosmium-js/data/*"].each do |file|
    next unless File.basename(file).start_with?(/[0-9]/)
    puts file
    filename = File.basename(file).gsub('.yaml', '.json')
    data = File.read(file)
    i = SciolyFF::Interpreter.new(data)
    hash = {
        :tournament => i.tournament.name || "Tournament",
        :events => i.events.map { |e| e.name }.sort,
        :placings => i.placings.map { |p| {:event => p.event.name, :team => p.team.number, :points => p.isolated_points, :place => p.place} }.sort_by { |p| [p[:team], p[:event]] },
    }
    File.open("./test/ruby/#{filename}", 'w') { |f| f.write(JSON.generate(hash)) }
end