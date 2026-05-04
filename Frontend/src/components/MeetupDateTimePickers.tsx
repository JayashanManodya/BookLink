import { createElement, useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  clampMeetupWhenNotInPast,
  combineLocalDateTimeToISO,
  localDateToMeetupStrings,
  mergeLocalCalendarPreserveTime,
  mergeLocalTimePreserveCalendar,
  isSameLocalCalendarDay,
  pad2,
  startOfLocalToday,
} from '../lib/meetupFormRules';
import { dreamland, lead, textSecondary, themeSurfaceMuted, warmHaze } from '../theme/colors';

type Props = {
  value: Date;
  onChange: (next: Date) => void;
  disabled?: boolean;
  dateHint: string;
  timeHint: string;
};

function formatMeetupPickDateDisplay(d: Date): string {
  try {
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return localDateToMeetupStrings(d).dateStr;
  }
}

function formatMeetupPickTimeDisplay(d: Date): string {
  return localDateToMeetupStrings(d).timeStr;
}

function localTimeHMMinAttr(nowLike: Date): string {
  return `${pad2(nowLike.getHours())}:${pad2(nowLike.getMinutes())}`;
}

function MeetupWebDateTimePickers({ value, onChange, disabled, dateHint, timeHint }: Props) {
  const { dateStr, timeStr } = localDateToMeetupStrings(value);
  const todayStr = useMemo(() => localDateToMeetupStrings(startOfLocalToday()).dateStr, []);
  const now = new Date();
  const sameDayAsToday = isSameLocalCalendarDay(value, now);
  const timeMin = sameDayAsToday ? localTimeHMMinAttr(now) : undefined;

  const webInputBase = useMemo(
    () =>
      ({
        backgroundColor: themeSurfaceMuted,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: dreamland,
        paddingLeft: 14,
        paddingRight: 14,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 16,
        color: lead,
        width: '100%',
        boxSizing: 'border-box',
      }) satisfies Record<string, string | number>,
    []
  );

  const pushFromWeb = (ds: string, ts: string) => {
    const iso = combineLocalDateTimeToISO(ds, ts);
    if (!iso) return;
    onChange(clampMeetupWhenNotInPast(new Date(iso)));
  };

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>Date</Text>
        {createElement('input', {
          type: 'date',
          disabled,
          value: dateStr,
          min: todayStr,
          style: webInputBase,
          onChange: (e: { target: { value: string } }) => pushFromWeb(e.target.value, timeStr),
        })}
        <Text style={styles.micro}>{dateHint}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Time (24h)</Text>
        {createElement('input', {
          type: 'time',
          disabled,
          value: timeStr,
          min: timeMin,
          style: webInputBase,
          onChange: (e: { target: { value: string } }) => pushFromWeb(dateStr, e.target.value),
        })}
        <Text style={styles.micro}>{timeHint}</Text>
      </View>
    </>
  );
}

export function MeetupDateTimePickers(props: Props) {
  const { value, onChange, disabled, dateHint, timeHint } = props;
  const [showAndroidDate, setShowAndroidDate] = useState(false);
  const [showAndroidTime, setShowAndroidTime] = useState(false);

  const now = useMemo(() => new Date(), [value.valueOf()]);
  const sameDayAsToday = isSameLocalCalendarDay(value, now);
  const timeMinimum = sameDayAsToday ? now : undefined;

  if (Platform.OS === 'web') {
    return <MeetupWebDateTimePickers {...props} />;
  }

  const onAndroidDate = (ev: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') setShowAndroidDate(false);
    if (ev.type !== 'set' || !picked || disabled) return;
    onChange(mergeLocalCalendarPreserveTime(value, picked));
  };

  const onAndroidTime = (ev: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') setShowAndroidTime(false);
    if (ev.type !== 'set' || !picked || disabled) return;
    onChange(mergeLocalTimePreserveCalendar(value, picked));
  };

  if (Platform.OS === 'android') {
    return (
      <>
        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <Pressable
            style={[styles.pickerBtn, disabled && styles.pickerBtnOff]}
            onPress={() => !disabled && setShowAndroidDate(true)}
            accessibilityRole="button"
            accessibilityLabel="Open date picker"
          >
            <Text style={styles.pickerBtnTxt}>{formatMeetupPickDateDisplay(value)}</Text>
            <Ionicons name="calendar-outline" size={20} color={lead} />
          </Pressable>
          <Text style={styles.micro}>{dateHint}</Text>
          {showAndroidDate ? (
            <DateTimePicker
              value={value}
              mode="date"
              display="default"
              minimumDate={startOfLocalToday()}
              onChange={onAndroidDate}
            />
          ) : null}
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Time (24h)</Text>
          <Pressable
            style={[styles.pickerBtn, disabled && styles.pickerBtnOff]}
            onPress={() => !disabled && setShowAndroidTime(true)}
            accessibilityRole="button"
            accessibilityLabel="Open time picker"
          >
            <Text style={styles.pickerBtnTxt}>{formatMeetupPickTimeDisplay(value)}</Text>
            <Ionicons name="time-outline" size={20} color={lead} />
          </Pressable>
          <Text style={styles.micro}>{timeHint}</Text>
          {showAndroidTime ? (
            <DateTimePicker
              value={value}
              mode="time"
              display="default"
              is24Hour
              minimumDate={timeMinimum}
              onChange={onAndroidTime}
            />
          ) : null}
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>Date</Text>
        <View style={styles.iosPickerRow}>
          <DateTimePicker
            value={value}
            mode="date"
            display="compact"
            themeVariant="light"
            minimumDate={startOfLocalToday()}
            onChange={(_, picked) => {
              if (!picked || disabled) return;
              onChange(mergeLocalCalendarPreserveTime(value, picked));
            }}
          />
        </View>
        <Text style={styles.micro}>{dateHint}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Time (24h)</Text>
        <View style={styles.iosPickerRow}>
          <DateTimePicker
            value={value}
            mode="time"
            display="compact"
            themeVariant="light"
            minimumDate={timeMinimum}
            onChange={(_, picked) => {
              if (!picked || disabled) return;
              onChange(mergeLocalTimePreserveCalendar(value, picked));
            }}
          />
        </View>
        <Text style={styles.micro}>{timeHint}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: warmHaze,
    marginBottom: 6,
  },
  micro: {
    marginTop: 6,
    fontSize: 12,
    color: textSecondary,
    lineHeight: 16,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: themeSurfaceMuted,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnOff: {
    opacity: 0.5,
  },
  pickerBtnTxt: {
    fontSize: 16,
    flex: 1,
    color: lead,
    fontWeight: '600',
  },
  iosPickerRow: {
    alignSelf: 'stretch',
    backgroundColor: themeSurfaceMuted,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingVertical: 6,
    minHeight: 48,
    justifyContent: 'center',
  },
});
