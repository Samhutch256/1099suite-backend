import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, TextInput, Pressable, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { supabase } from '@/lib/supabase';
import { IRS_RATES_CENTS, TripType } from './config';

type Trip = {
  id: string;
  started_at: string;
  ended_at: string;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  miles: number;
  classification: TripType;
  rate_cents: number;
  deduction_cents: number;
  notes: string | null;
};

type Point = { lat: number; lng: number; t: string };

export default function TripDetail({ route, navigation }: any) {
  const { id } = route.params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [saving, setSaving] = useState(false);

  const [classification, setClassification] = useState<TripType>('personal');
  const [miles, setMiles] = useState<string>('0.00');
  const [notes, setNotes] = useState<string>('');

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase
        .from('mileage_trips')
        .select('*')
        .eq('id', id)
        .single();
      if (t) {
        setTrip(t as Trip);
        setClassification((t.classification as TripType) ?? 'personal');
        setMiles(Number(t.miles ?? 0).toFixed(2));
        setNotes(t.notes ?? '');
      }
      const { data: pts } = await supabase
        .from('mileage_trip_points')
        .select('t, lat, lng')
        .eq('trip_id', id)
        .order('t', { ascending: true });
      setPoints((pts ?? []) as Point[]);
    })();
  }, [id]);

  const coords = useMemo(
    () => points.map(p => ({ latitude: p.lat, longitude: p.lng })),
    [points]
  );

  useEffect(() => {
    if (coords.length >= 2 && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, bottom: 60, left: 40, right: 40 },
        animated: false
      });
    }
  }, [coords]);

  async function onSave() {
    if (!trip) return;
    setSaving(true);
    try {
      const milesNum = Math.max(0, Number(miles || 0));
      const rate = IRS_RATES_CENTS[classification];
      const deduction = Math.floor(milesNum * rate);
      const { error } = await supabase
        .from('mileage_trips')
        .update({
          classification,
          miles: milesNum,
          rate_cents: rate,
          deduction_cents: deduction,
          notes
        })
        .eq('id', trip.id);
      if (error) throw error;
      Alert.alert('Saved');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Save failed', e.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  if (!trip) {
    return <View className="flex-1 items-center justify-center bg-slate-950"><ActivityIndicator /></View>;
  }

  const start = coords[0];
  const end = coords[coords.length - 1];

  return (
    <View className="flex-1 bg-slate-950">
      <View style={{ height: 320 }}>
        <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={{
          latitude: start?.latitude ?? (trip.start_lat ?? 39.7392),
          longitude: start?.longitude ?? (trip.start_lng ?? -104.9903),
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}>
          {coords.length >= 2 && <Polyline coordinates={coords} width={4} />}
          {start && <Marker coordinate={start} title="Start" />}
          {end && <Marker coordinate={end} title="End" />}
        </MapView>
      </View>

      <View className="p-4 gap-3">
        <Text className="text-slate-200 font-semibold">Trip Details</Text>

        <View>
          <Text className="text-slate-400 mb-1">Classification</Text>
          <View className="flex-row gap-2">
            {(['business','medical','charity','personal'] as TripType[]).map(t => (
              <Pressable
                key={t}
                onPress={() => setClassification(t)}
                className={`px-3 py-2 rounded-xl ${classification===t?'bg-emerald-600':'bg-slate-800'}`}>
                <Text className="text-white capitalize">{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text className="text-slate-400 mb-1">Miles</Text>
          <TextInput
            keyboardType="decimal-pad"
            value={miles}
            onChangeText={setMiles}
            className="bg-slate-800 text-slate-100 rounded-xl px-3 py-2"
          />
        </View>

        <View>
          <Text className="text-slate-400 mb-1">Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            className="bg-slate-800 text-slate-100 rounded-xl px-3 py-2"
          />
        </View>

        <Pressable disabled={saving} onPress={onSave} className="bg-emerald-600 rounded-2xl py-3 items-center mt-2">
          <Text className="text-white font-semibold">{saving ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
