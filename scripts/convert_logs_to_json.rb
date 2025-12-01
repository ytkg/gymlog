#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "optparse"

HEADING_REGEX = /^\s*#+\s*(\d{4}-\d{2}-\d{2})\s*$/

def parse_entries(text)
  entries = []
  current_date = nil
  buffer = []

  text.each_line do |line|
    if (match = line.match(HEADING_REGEX))
      entries << { date: current_date, body: buffer.join("\n").rstrip } if current_date
      current_date = match[1]
      buffer = []
      next
    end

    next unless current_date

    buffer << line.chomp
  end

  entries << { date: current_date, body: buffer.join("\n").rstrip } if current_date
  entries
end

def month_counts(entries)
  counts = Hash.new(0)
  entries.each do |entry|
    month = entry[:date][0, 7]
    counts[month] += 1
  end

  counts.keys.sort.map do |month|
    { date: "#{month}-01", count: counts[month] }
  end
end

def read_text(path)
  File.read(path, encoding: "UTF-8")
rescue Errno::ENOENT
  abort "Input file not found: #{path}"
end

def write_output(data, path)
  File.write(path, data, encoding: "UTF-8")
end

def main(argv)
  options = {
    input: "logs.md",
    output: nil,
    compact: false
  }

  OptionParser.new do |opts|
    opts.banner = "Usage: convert_logs_to_json.rb [options]"

    opts.on("-i", "--input FILE", "Input Markdown file (default: logs.md)") do |v|
      options[:input] = v
    end

    opts.on("-o", "--output FILE", "Output JSON file (default: stdout)") do |v|
      options[:output] = v
    end

    opts.on("--compact", "Emit compact JSON (no pretty print)") do
      options[:compact] = true
    end
  end.parse!(argv)

  text = read_text(options[:input])
  entries = parse_entries(text)
  months = month_counts(entries)

  output = { entries: entries, month_counts: months }

  json_data =
    if options[:compact]
      JSON.generate(output)
    else
      JSON.pretty_generate(output, indent: "  ")
    end

  if options[:output]
    write_output(json_data, options[:output])
  else
    puts json_data
  end
end

if $PROGRAM_NAME == __FILE__
  main(ARGV)
end
